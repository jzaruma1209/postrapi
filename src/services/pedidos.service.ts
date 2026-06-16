import { db } from "../db";
import { pedidos, pedidoItems, productos } from "../db/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { generateId } from "../utils/uuid";
import { nowISO, todayDate } from "../utils/dates";
import { crearVenta } from "./ventas.service";
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
  const { items, clienteNombre, nota, origen } = params;
  const pedidoId = generateId();
  const now = nowISO();

  await db.transaction(async (tx) => {
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
  });

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
  metodoPago: MetodoPago
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
  });

  return ventaId;
}

export async function getPedidosActivos() {
  return await db
    .select()
    .from(pedidos)
    .where(ne(pedidos.estado, "entregado"))
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
    .where(eq(pedidos.created_at, hoy))
    .orderBy(desc(pedidos.created_at));
}
