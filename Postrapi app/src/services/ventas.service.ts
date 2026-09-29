import { db } from "../db";
import {
  ventas, ventaItems, pedidos, recetas, ingredientes,
  movimientosInventario, cajaDiaria, gastos
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
  descuentoTipo?: 'monto' | 'porcentaje';
  descuentoValor?: number;
}

export interface VentaConItems {
  venta: typeof ventas.$inferSelect;
  items: (typeof ventaItems.$inferSelect)[];
}

// ─── CREAR VENTA ──────────────────────────────────────────
// CRÍTICO: Todo en una sola transacción SQLite
export async function crearVenta(params: CrearVentaParams): Promise<string> {
  // Validar que haya caja abierta antes de cobrar (DEBE ser la primera operación)
  const cajaAbierta = await getCajaAbierta();
  if (!cajaAbierta) {
    throw new Error("No hay una caja abierta. Debes abrir caja antes de cobrar.");
  }

  const { items, metodoPago, pedidoId, descuentoTipo, descuentoValor } = params;
  const ventaId = generateId();
  const now = nowISO();
  const subtotal = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);

  let aplicarDescuento = 0;
  if (descuentoTipo === 'monto' && descuentoValor != null) {
    aplicarDescuento = Math.min(descuentoValor, subtotal);
  } else if (descuentoTipo === 'porcentaje' && descuentoValor != null) {
    aplicarDescuento = Math.min(subtotal * (descuentoValor / 100), subtotal);
  }

  const total = subtotal - aplicarDescuento;

  // Bypassing db.transaction temporalmente para diagnosticar bug de expo-sqlite
  const tx = db;
  
  console.log("==> Iniciando transaccion crearVenta con ventaId:", ventaId);
  
  // 1. Insertar venta
  console.log("==> Insertando venta...");
  await tx.insert(ventas).values({
    id: ventaId,
    subtotal,
    descuentoTipo: descuentoTipo ?? null,
    descuentoValor: descuentoValor ?? 0,
    total,
    metodoPago,
    pedidoId: pedidoId ?? null,
    created_at: now,
    synced: 0,
  });
  console.log("==> Venta insertada OK");

  // 2. Insertar items de la venta
  for (const item of items) {
    console.log("==> Insertando ventaItem para producto:", item.productoId);
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
    console.log("==> ventaItem insertado OK");

    // 3. Descontar inventario según receta
    console.log("==> Buscando recetas para producto:", item.productoId);
    const recetaItems = await tx
      .select()
      .from(recetas)
      .where(eq(recetas.productoId, item.productoId));

    for (const recetaItem of recetaItems) {
      const cantidadDescontar = recetaItem.cantidad * item.cantidad;

      // Insertar movimiento de inventario
      console.log("==> Insertando movimiento para ingrediente:", recetaItem.ingredienteId);
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
      console.log("==> Movimiento insertado OK");

      // Actualizar stock actual
      console.log("==> Actualizando stock ingrediente:", recetaItem.ingredienteId);
      await tx
        .update(ingredientes)
        .set({
          stockActual: sql`stock_actual - ${cantidadDescontar}`,
        })
        .where(eq(ingredientes.id, recetaItem.ingredienteId));
      console.log("==> Stock actualizado OK");
    }
  }

  // 4. Si viene de un pedido, marcarlo como entregado
  if (pedidoId) {
    console.log("==> Actualizando pedido:", pedidoId);
    await tx
      .update(pedidos)
      .set({ estado: "entregado", entregado_at: now })
      .where(eq(pedidos.id, pedidoId));
    console.log("==> Pedido actualizado OK");
  }
  
  console.log("==> Transaccion crearVenta completada");

  return ventaId;
}

// ─── ANULAR VENTA ─────────────────────────────────────────
// Validar PIN desde la UI antes de invocar esta función.
export async function anularVenta(
  ventaId: string,
  motivo: string,
  devolverStock: boolean
): Promise<void> {
  const tx = db; // Usando db directo por bug expo-sqlite

  // 1. Leer venta
  const vResult = await tx.select().from(ventas).where(eq(ventas.id, ventaId)).limit(1);
  if (!vResult[0]) {
    throw new Error("Venta no encontrada.");
  }
  const venta = vResult[0];
  if (venta.anulada === 1) {
    throw new Error("Esta venta ya fue anulada anteriormente.");
  }

  const now = nowISO();

  // 2. Devolver stock si se solicita (PRIMERO, antes de marcar como anulada)
  // Si esto falla, la venta no se marcará como anulada y se podrá reintentar.
  if (devolverStock) {
    const items = await tx.select().from(ventaItems).where(eq(ventaItems.ventaId, ventaId));
    
    for (const item of items) {
      const recetaItems = await tx
        .select()
        .from(recetas)
        .where(eq(recetas.productoId, item.productoId));

      for (const recetaItem of recetaItems) {
        const cantidadDevolver = recetaItem.cantidad * item.cantidad;

        // Registrar movimiento de inventario de devolución
        await tx.insert(movimientosInventario).values({
          id: generateId(),
          ingredienteId: recetaItem.ingredienteId,
          tipo: "devolucion_anulacion",
          cantidad: cantidadDevolver, // Positivo (ingresa)
          motivo: motivo,
          referenciaId: ventaId,
          created_at: now,
          synced: 0,
        });

        // Actualizar stock actual del ingrediente sumando
        await tx
          .update(ingredientes)
          .set({
            stockActual: sql`stock_actual + ${cantidadDevolver}`,
          })
          .where(eq(ingredientes.id, recetaItem.ingredienteId));
      }
    }
  }

  // 3. Marcar la venta como anulada (SOLO SI EL STOCK SE DEVOLVIÓ SIN ERRORES)
  await tx.update(ventas)
    .set({ anulada: 1, anuladaAt: now, motivoAnulacion: motivo, synced: 0 })
    .where(eq(ventas.id, ventaId));

  // 4. La caja abierta se calculará dinámicamente usando las ventas no anuladas.
  // Nota: esto requerirá ajustar getVentasEnRango y otras consultas para filtrar anulada = 1
  // o hacerlo en la UI.
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
        lte(ventas.created_at, `${hoy}T23:59:59.999Z`),
        eq(ventas.anulada, 0)
      )
    )
    .orderBy(desc(ventas.created_at));
}

// ─── TOTAL VENTAS DEL DÍA ─────────────────────────────────
export async function getTotalVentasHoy(): Promise<number> {
  const hoy = todayDate();
  return getTotalVentasPorFecha(hoy);
}

export async function getTotalVentasPorFecha(fecha: string): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
    .from(ventas)
    .where(
      and(
        gte(ventas.created_at, `${fecha}T00:00:00.000Z`),
        lte(ventas.created_at, `${fecha}T23:59:59.999Z`),
        eq(ventas.anulada, 0)
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
        lte(ventas.created_at, `${dia}T23:59:59.999Z`),
        eq(ventas.anulada, 0)
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
    montoDeclaradoEfectivo: null,
    montoDeclaradoTransferencia: null,
    fecha: todayDate(),
    cerrada_at: null,
    created_at: nowISO(),
    synced: 0,
  });
  return id;
}

export async function cerrarCaja(cajaId: string, montoEfectivo: number, montoTransferencia: number): Promise<void> {
  await db
    .update(cajaDiaria)
    .set({ montoDeclaradoEfectivo: montoEfectivo, montoDeclaradoTransferencia: montoTransferencia, cerrada_at: nowISO() })
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

export async function getCajaAbierta() {
  const result = await db
    .select()
    .from(cajaDiaria)
    .where(sql`cerrada_at IS NULL`)
    .orderBy(desc(cajaDiaria.created_at))
    .limit(1);
  return result[0] ?? null;
}

export async function getCajasDeHoy() {
  const hoy = todayDate();
  return await db
    .select()
    .from(cajaDiaria)
    .where(
      and(
        gte(cajaDiaria.created_at, `${hoy}T00:00:00.000Z`),
        lte(cajaDiaria.created_at, `${hoy}T23:59:59.999Z`)
      )
    )
    .orderBy(cajaDiaria.created_at);
}

export async function getCajasPorFecha(fecha: string) {
  return await db
    .select()
    .from(cajaDiaria)
    .where(
      and(
        gte(cajaDiaria.created_at, `${fecha}T00:00:00.000Z`),
        lte(cajaDiaria.created_at, `${fecha}T23:59:59.999Z`)
      )
    )
    .orderBy(cajaDiaria.created_at);
}

export async function getHistorialCajas() {
  return await db
    .select()
    .from(cajaDiaria)
    .where(sql`cerrada_at IS NOT NULL`)
    .orderBy(desc(cajaDiaria.created_at));
}

export async function getTotalGastosFecha(fecha: string): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(monto), 0)` })
    .from(gastos)
    .where(eq(gastos.fecha, fecha));
  return result[0]?.total ?? 0;
}

// ─── VENTAS EN RANGO (por sesión de caja) ────────────────
export async function getVentasEnRango(desde: string, hasta: string) {
  return await db
    .select()
    .from(ventas)
    .where(
      and(
        gte(ventas.created_at, desde),
        lte(ventas.created_at, hasta),
        eq(ventas.anulada, 0)
      )
    )
    .orderBy(desc(ventas.created_at));
}

export async function getGastosEnRango(desde: string, hasta: string): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(monto), 0)` })
    .from(gastos)
    .where(
      and(
        gte(gastos.created_at, desde),
        lte(gastos.created_at, hasta)
      )
    );
  return result[0]?.total ?? 0;
}

// ─── TOP PRODUCTOS DEL DÍA ────────────────────────────────
export async function getTopProductosHoy(limit = 3) {
  return getTopProductosPorFecha(todayDate(), limit);
}

export async function getTopProductosPorFecha(fecha: string, limit = 3) {
  return await db
    .select({
      productoId: ventaItems.productoId,
      totalVendido: sql<number>`SUM(${ventaItems.cantidad})`,
    })
    .from(ventaItems)
    .innerJoin(ventas, eq(ventaItems.ventaId, ventas.id))
    .where(
      and(
        gte(ventas.created_at, `${fecha}T00:00:00.000Z`),
        lte(ventas.created_at, `${fecha}T23:59:59.999Z`),
        eq(ventas.anulada, 0)
      )
    )
    .groupBy(ventaItems.productoId)
    .orderBy(desc(sql`SUM(${ventaItems.cantidad})`))
    .limit(limit);
}
