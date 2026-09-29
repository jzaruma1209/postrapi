import { db } from "../db";
import { pedidos, pedidoItems, productos, ventas } from "../db/schema";
import { eq, and, ne, desc, gte, lte } from "drizzle-orm";
import { generateId } from "../utils/uuid";
import { nowISO, todayDate } from "../utils/dates";
import { crearVenta, getCajaAbierta, anularVenta } from "./ventas.service";
import type { OrigenPedido, EstadoPedido, MetodoPago } from "../utils/types";

export interface ItemPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface CrearPedidoParams {
  items: ItemPedido[];
  clienteNombre?: string;
  nota?: string;
  origen: OrigenPedido;
}

export async function crearPedido(params: CrearPedidoParams): Promise<string> {
  // Validar que haya caja abierta antes de crear pedido
  const cajaAbierta = await getCajaAbierta();
  if (!cajaAbierta) {
    throw new Error("No hay una caja abierta. Debes abrir caja antes de crear un pedido.");
  }

  const { items, clienteNombre, nota, origen } = params;
  const pedidoId = generateId();
  const now = nowISO();

  // Bypassing db.transaction temporalmente para diagnosticar bug de expo-sqlite
  const tx = db;
  
  await tx.insert(pedidos).values({
    id: pedidoId,
    clienteNombre: clienteNombre ?? null,
    nota: nota ?? null,
    origen,
    estado: "pendiente",
    created_at: now,
    entregado_at: null,
    synced: 0,
  });

  for (const item of items) {
    await tx.insert(pedidoItems).values({
      id: generateId(),
      pedidoId,
      productoId: item.productoId,
      cantidad: item.cantidad,
      created_at: now,
      synced: 0,
    });
  }

  return pedidoId;
}

export async function cambiarEstadoPedido(
  pedidoId: string,
  estado: EstadoPedido
): Promise<void> {
  await db
    .update(pedidos)
    .set({ estado })
    .where(eq(pedidos.id, pedidoId));
}

export async function entregarPedido(
  pedidoId: string,
  metodoPago: MetodoPago,
  descuentoTipo?: 'monto' | 'porcentaje',
  descuentoValor?: number
): Promise<string> {
  // Obtener items del pedido
  const items = await db
    .select()
    .from(pedidoItems)
    .where(eq(pedidoItems.pedidoId, pedidoId));

  // Obtener precios actuales de los productos
  const itemsConPrecio = await Promise.all(
    items.map(async (item) => {
      const prod = await db
        .select()
        .from(productos)
        .where(eq(productos.id, item.productoId))
        .limit(1);
      return {
        productoId: item.productoId,
        nombre: prod[0]?.nombre ?? "",
        cantidad: item.cantidad,
        precioUnitario: prod[0]?.precio ?? 0,
      };
    })
  );

  // Crear venta (esto también marca el pedido como entregado)
  const ventaId = await crearVenta({
    items: itemsConPrecio,
    metodoPago,
    pedidoId,
    descuentoTipo,
    descuentoValor,
  });

  return ventaId;
}

export async function getPedidosActivos() {
  return await db
    .select()
    .from(pedidos)
    .where(
      and(
        ne(pedidos.estado, "entregado"),
        ne(pedidos.estado, "anulado")
      )
    )
    .orderBy(desc(pedidos.created_at));
}

export async function getPedidoItems(pedidoId: string) {
  return await db
    .select()
    .from(pedidoItems)
    .where(eq(pedidoItems.pedidoId, pedidoId));
}

export async function getPedidosHoy() {
  const hoy = todayDate();
  return await db
    .select()
    .from(pedidos)
    .where(
      and(
        gte(pedidos.created_at, `${hoy}T00:00:00.000Z`),
        lte(pedidos.created_at, `${hoy}T23:59:59.999Z`)
      )
    )
    .orderBy(desc(pedidos.created_at));
}

export async function getPedidosPendientesCount(): Promise<number> {
  const result = await db
    .select()
    .from(pedidos)
    .where(eq(pedidos.estado, "pendiente"));
  return result.length;
}

// ─── ANULAR PEDIDO ────────────────────────────────────────
// Validar PIN desde la UI antes de invocar esta función.
export async function anularPedido(pedidoId: string, motivo: string): Promise<void> {
  const tx = db; // Usando db directo por bug expo-sqlite

  // 1. Leer pedido
  const pResult = await tx.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  if (!pResult[0]) {
    throw new Error("Pedido no encontrado.");
  }
  const pedido = pResult[0];
  if (pedido.estado === "anulado") {
    throw new Error("Este pedido ya está anulado.");
  }

  const now = nowISO();

  // 2. Si está pendiente o preparando
  if (pedido.estado === "pendiente" || pedido.estado === "preparando") {
    await tx.update(pedidos)
      .set({ estado: "anulado", anuladoAt: now, motivoAnulacion: motivo, synced: 0 })
      .where(eq(pedidos.id, pedidoId));
  } 
  // 3. Si está entregado (tiene venta asociada)
  else if (pedido.estado === "entregado") {
    // Buscar la venta asociada
    const vResult = await tx.select().from(ventas).where(eq(ventas.pedidoId, pedidoId)).limit(1);
    if (vResult[0]) {
      // Llamar a anularVenta internamente (siempre devolvemos stock para pedidos anulados entregados)
      await anularVenta(vResult[0].id, motivo, true);
    }
    
    // Marcar también el pedido como anulado
    await tx.update(pedidos)
      .set({ estado: "anulado", anuladoAt: now, motivoAnulacion: motivo, synced: 0 })
      .where(eq(pedidos.id, pedidoId));
  }
}
