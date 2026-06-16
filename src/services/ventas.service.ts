import { db } from "../db";
import {
  ventas, ventaItems, pedidos, recetas, ingredientes,
  movimientosInventario, cajaDiaria
} from "../db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { generateId } from "../utils/uuid";
import { nowISO, todayDate } from "../utils/dates";
import type { MetodoPago } from "../utils/types";

// ─── TIPOS ────────────────────────────────────────────────
export interface ItemVenta {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CrearVentaParams {
  items: ItemVenta[];
  metodoPago: MetodoPago;
  pedidoId?: string;
}

export interface VentaConItems {
  venta: typeof ventas.$inferSelect;
  items: (typeof ventaItems.$inferSelect)[];
}

// ─── CREAR VENTA ──────────────────────────────────────────
// CRÍTICO: Todo en una sola transacción SQLite
export async function crearVenta(params: CrearVentaParams): Promise<string> {
  const { items, metodoPago, pedidoId } = params;
  const ventaId = generateId();
  const now = nowISO();
  const total = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);

  // Transacción: venta + items + descuento inventario
  await db.transaction(async (tx) => {
    // 1. Insertar venta
    await tx.insert(ventas).values({
      id: ventaId,
      total,
      metodoPago,
      pedidoId: pedidoId ?? null,
      created_at: now,
      synced: 0,
    });

    // 2. Insertar items de la venta
    for (const item of items) {
      await tx.insert(ventaItems).values({
        id: generateId(),
        ventaId,
        productoId: item.productoId,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.cantidad * item.precioUnitario,
        created_at: now,
        synced: 0,
      });

      // 3. Descontar inventario según receta
      const recetaItems = await tx
        .select()
        .from(recetas)
        .where(eq(recetas.productoId, item.productoId));

      for (const recetaItem of recetaItems) {
        const cantidadDescontar = recetaItem.cantidad * item.cantidad;

        // Insertar movimiento de inventario
        await tx.insert(movimientosInventario).values({
          id: generateId(),
          ingredienteId: recetaItem.ingredienteId,
          tipo: "descuento_venta",
          cantidad: -cantidadDescontar, // negativo = salida
          motivo: null,
          referenciaId: ventaId,
          created_at: now,
          synced: 0,
        });

        // Actualizar stock actual
        await tx
          .update(ingredientes)
          .set({
            stockActual: sql`stock_actual - ${cantidadDescontar}`,
          })
          .where(eq(ingredientes.id, recetaItem.ingredienteId));
      }
    }

    // 4. Si viene de un pedido, marcarlo como entregado
    if (pedidoId) {
      await tx
        .update(pedidos)
        .set({ estado: "entregado", entregado_at: now })
        .where(eq(pedidos.id, pedidoId));
    }
  });

  return ventaId;
}

// ─── OBTENER VENTAS DEL DÍA ───────────────────────────────
export async function getVentasHoy() {
  const hoy = todayDate();
  return await db
    .select()
    .from(ventas)
    .where(
      and(
        gte(ventas.created_at, `${hoy}T00:00:00.000Z`),
        lte(ventas.created_at, `${hoy}T23:59:59.999Z`)
      )
    )
    .orderBy(desc(ventas.created_at));
}

// ─── TOTAL VENTAS DEL DÍA ─────────────────────────────────
export async function getTotalVentasHoy(): Promise<number> {
  const hoy = todayDate();
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
    .from(ventas)
    .where(
      and(
        gte(ventas.created_at, `${hoy}T00:00:00.000Z`),
        lte(ventas.created_at, `${hoy}T23:59:59.999Z`)
      )
    );
  return result[0]?.total ?? 0;
}

// ─── OBTENER VENTA CON ITEMS ──────────────────────────────
export async function getVentaConItems(ventaId: string): Promise<VentaConItems | null> {
  const venta = await db.select().from(ventas).where(eq(ventas.id, ventaId)).limit(1);
  if (!venta[0]) return null;
  const items = await db.select().from(ventaItems).where(eq(ventaItems.ventaId, ventaId));
  return { venta: venta[0], items };
}

// ─── HISTORIAL DE VENTAS ──────────────────────────────────
export async function getHistorialVentas(fecha?: string) {
  const dia = fecha ?? todayDate();
  return await db
    .select()
    .from(ventas)
    .where(
      and(
        gte(ventas.created_at, `${dia}T00:00:00.000Z`),
        lte(ventas.created_at, `${dia}T23:59:59.999Z`)
      )
    )
    .orderBy(desc(ventas.created_at));
}

// ─── CAJA ─────────────────────────────────────────────────
export async function abrirCaja(montoInicial: number): Promise<string> {
  const id = generateId();
  await db.insert(cajaDiaria).values({
    id,
    montoInicial,
    montoDeclarado: null,
    fecha: todayDate(),
    cerrada_at: null,
    created_at: nowISO(),
    synced: 0,
  });
  return id;
}

export async function cerrarCaja(cajaId: string, montoDeclarado: number): Promise<void> {
  await db
    .update(cajaDiaria)
    .set({ montoDeclarado, cerrada_at: nowISO() })
    .where(eq(cajaDiaria.id, cajaId));
}

export async function getCajaHoy() {
  const hoy = todayDate();
  const result = await db
    .select()
    .from(cajaDiaria)
    .where(eq(cajaDiaria.fecha, hoy))
    .limit(1);
  return result[0] ?? null;
}

// ─── TOP PRODUCTOS DEL DÍA ────────────────────────────────
export async function getTopProductosHoy(limit = 3) {
  const hoy = todayDate();
  return await db
    .select({
      productoId: ventaItems.productoId,
      totalVendido: sql<number>`SUM(${ventaItems.cantidad})`,
    })
    .from(ventaItems)
    .innerJoin(ventas, eq(ventaItems.ventaId, ventas.id))
    .where(
      and(
        gte(ventas.created_at, `${hoy}T00:00:00.000Z`),
        lte(ventas.created_at, `${hoy}T23:59:59.999Z`)
      )
    )
    .groupBy(ventaItems.productoId)
    .orderBy(desc(sql`SUM(${ventaItems.cantidad})`))
    .limit(limit);
}
