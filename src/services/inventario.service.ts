import { db } from "../db";
import {
  ingredientes, movimientosInventario, compras, gastos, recetas, ventaItems, ventas
} from "../db/schema";
import { eq, and, gte, lte, sql, desc, lt } from "drizzle-orm";
import { generateId } from "../utils/uuid";
import { nowISO, todayDate } from "../utils/dates";
import type { CategoriaGasto } from "../utils/types";

// ─── INGREDIENTES ─────────────────────────────────────────
export async function getIngredientes() {
  return await db.select().from(ingredientes).orderBy(ingredientes.nombre);
}

export async function getIngredienteById(id: string) {
  const result = await db.select().from(ingredientes).where(eq(ingredientes.id, id)).limit(1);
  return result[0] ?? null;
}

export async function crearIngrediente(data: {
  nombre: string;
  unidad: string;
  stockMinimo: number;
}): Promise<string> {
  const id = generateId();
  await db.insert(ingredientes).values({
    id,
    nombre: data.nombre,
    unidad: data.unidad,
    stockActual: 0,
    stockMinimo: data.stockMinimo,
    created_at: nowISO(),
    synced: 0,
  });
  return id;
}

export async function editarIngrediente(
  id: string,
  data: Partial<{ nombre: string; unidad: string; stockMinimo: number }>
): Promise<void> {
  await db.update(ingredientes).set(data).where(eq(ingredientes.id, id));
}

// ─── ALERTAS DE STOCK BAJO ────────────────────────────────
export async function getIngredientesStockBajo() {
  return await db
    .select()
    .from(ingredientes)
    .where(sql`stock_actual <= stock_minimo`);
}

// ─── AJUSTE MANUAL DE STOCK ───────────────────────────────
// Requiere PIN — verificar PIN antes de llamar esta función
export async function ajustarStock(params: {
  ingredienteId: string;
  stockReal: number; // lo que el dueño contó físicamente
  motivo: string;
}): Promise<void> {
  const { ingredienteId, stockReal, motivo } = params;
  const now = nowISO();

  const ingrediente = await getIngredienteById(ingredienteId);
  if (!ingrediente) throw new Error("Ingrediente no encontrado");

  const diferencia = stockReal - ingrediente.stockActual;

  await db.transaction(async (tx) => {
    // Registrar movimiento
    await tx.insert(movimientosInventario).values({
      id: generateId(),
      ingredienteId,
      tipo: "ajuste",
      cantidad: diferencia, // puede ser positivo o negativo
      motivo,
      referenciaId: null,
      created_at: now,
      synced: 0,
    });

    // Actualizar stock
    await tx
      .update(ingredientes)
      .set({ stockActual: stockReal })
      .where(eq(ingredientes.id, ingredienteId));
  });
}

// ─── HISTORIAL DE AJUSTES ─────────────────────────────────
export async function getHistorialAjustes(ingredienteId?: string) {
  if (ingredienteId) {
    return await db
      .select()
      .from(movimientosInventario)
      .where(
        and(
          eq(movimientosInventario.ingredienteId, ingredienteId),
          eq(movimientosInventario.tipo, "ajuste")
        )
      )
      .orderBy(desc(movimientosInventario.created_at));
  }
  return await db
    .select()
    .from(movimientosInventario)
    .where(eq(movimientosInventario.tipo, "ajuste"))
    .orderBy(desc(movimientosInventario.created_at));
}

// ─── COMPRAS ──────────────────────────────────────────────
// Requiere PIN — verificar PIN antes de llamar esta función
export async function registrarCompra(params: {
  ingredienteId: string;
  cantidad: number;
  costoTotal: number;
  fecha: string;
}): Promise<void> {
  const { ingredienteId, cantidad, costoTotal, fecha } = params;
  const now = nowISO();

  await db.transaction(async (tx) => {
    // Registrar compra
    await tx.insert(compras).values({
      id: generateId(),
      ingredienteId,
      cantidad,
      costoTotal,
      fecha,
      created_at: now,
      synced: 0,
    });

    // Registrar movimiento de inventario
    await tx.insert(movimientosInventario).values({
      id: generateId(),
      ingredienteId,
      tipo: "compra",
      cantidad, // positivo = entrada
      motivo: null,
      referenciaId: null,
      created_at: now,
      synced: 0,
    });

    // Actualizar stock
    await tx
      .update(ingredientes)
      .set({ stockActual: sql`stock_actual + ${cantidad}` })
      .where(eq(ingredientes.id, ingredienteId));
  });
}

export async function getCompras(fecha?: string) {
  const dia = fecha ?? todayDate();
  return await db
    .select()
    .from(compras)
    .where(eq(compras.fecha, dia))
    .orderBy(desc(compras.created_at));
}

export async function getTotalComprasHoy(): Promise<number> {
  const hoy = todayDate();
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(costo_total), 0)` })
    .from(compras)
    .where(eq(compras.fecha, hoy));
  return result[0]?.total ?? 0;
}

// ─── COSTO UNITARIO PROMEDIO ──────────────────────────────
// Para calcular ganancia estimada
export async function getCostoUnitarioPromedio(ingredienteId: string): Promise<number> {
  const ultimasCompras = await db
    .select()
    .from(compras)
    .where(eq(compras.ingredienteId, ingredienteId))
    .orderBy(desc(compras.created_at))
    .limit(5);

  if (ultimasCompras.length === 0) return 0;

  const totalCosto = ultimasCompras.reduce((acc, c) => acc + c.costoTotal, 0);
  const totalCantidad = ultimasCompras.reduce((acc, c) => acc + c.cantidad, 0);

  return totalCantidad > 0 ? totalCosto / totalCantidad : 0;
}

// ─── GASTOS ───────────────────────────────────────────────
// Requiere PIN — verificar PIN antes de llamar esta función
export async function registrarGasto(params: {
  concepto: string;
  monto: number;
  categoria: CategoriaGasto;
  fecha: string;
}): Promise<void> {
  await db.insert(gastos).values({
    id: generateId(),
    ...params,
    created_at: nowISO(),
    synced: 0,
  });
}

export async function getGastosHoy() {
  const hoy = todayDate();
  return await db
    .select()
    .from(gastos)
    .where(eq(gastos.fecha, hoy))
    .orderBy(desc(gastos.created_at));
}

export async function getTotalGastosHoy(): Promise<number> {
  const hoy = todayDate();
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(monto), 0)` })
    .from(gastos)
    .where(eq(gastos.fecha, hoy));
  return result[0]?.total ?? 0;
}

// ─── COSTO INGREDIENTES USADOS HOY ───────────────────────
// Para ganancia estimada en Resumen
export async function getCostoIngredientesHoy(): Promise<number> {
  const hoy = todayDate();

  const movimientos = await db
    .select()
    .from(movimientosInventario)
    .where(
      and(
        eq(movimientosInventario.tipo, "descuento_venta"),
        gte(movimientosInventario.created_at, `${hoy}T00:00:00.000Z`),
        lte(movimientosInventario.created_at, `${hoy}T23:59:59.999Z`)
      )
    );

  let costoTotal = 0;
  for (const mov of movimientos) {
    const costoUnitario = await getCostoUnitarioPromedio(mov.ingredienteId);
    costoTotal += Math.abs(mov.cantidad) * costoUnitario;
  }

  return costoTotal;
}
