import { db } from "../db";
import { ventas, ventaItems, pedidos, pedidoItems, productos } from "../db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { todayDate } from "../utils/dates";

export async function getVentasDelDia(fecha?: string) {
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

export async function getPedidosDelDia(fecha?: string) {
  const dia = fecha ?? todayDate();
  return await db
    .select()
    .from(pedidos)
    .where(
      and(
        gte(pedidos.created_at, `${dia}T00:00:00.000Z`),
        lte(pedidos.created_at, `${dia}T23:59:59.999Z`)
      )
    )
    .orderBy(desc(pedidos.created_at));
}

export async function getVentaItemsPorVenta(ventaId: string) {
  return await db
    .select()
    .from(ventaItems)
    .where(eq(ventaItems.ventaId, ventaId));
}

export async function getPedidoItemsPorPedido(pedidoId: string) {
  return await db
    .select()
    .from(pedidoItems)
    .where(eq(pedidoItems.pedidoId, pedidoId));
}

export async function getProductoNombre(productoId: string): Promise<string> {
  const result = await db
    .select({ nombre: productos.nombre })
    .from(productos)
    .where(eq(productos.id, productoId))
    .limit(1);
  return result[0]?.nombre ?? "Producto eliminado";
}
