import NetInfo from "@react-native-community/netinfo";
import { supabase, isSupabaseConfigured } from "../supabase/client";
import { db } from "../db";
import {
  productos, ingredientes, recetas, pedidos, pedidoItems,
  ventas, ventaItems, movimientosInventario, compras, gastos, cajaDiaria,
  syncLog,
} from "../db/schema";
import { count, desc, eq } from "drizzle-orm";
import { generateId } from "../utils/uuid";

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/([A-Z])/g, '_$1').toLowerCase(),
      v
    ])
  );
}

const SYNC_TABLES = [
  { table: productos, name: "productos" },
  { table: ingredientes, name: "ingredientes" },
  { table: recetas, name: "recetas" },
  { table: pedidos, name: "pedidos" },
  { table: pedidoItems, name: "pedido_items" },
  { table: ventas, name: "ventas" },
  { table: ventaItems, name: "venta_items" },
  { table: movimientosInventario, name: "movimientos_inventario" },
  { table: compras, name: "compras" },
  { table: gastos, name: "gastos" },
  { table: cajaDiaria, name: "caja_diaria" },
] as const;

let syncEnProgreso = false;

export async function sincronizar(): Promise<{ ok: boolean; mensaje: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, mensaje: "Supabase no configurado" };
  }

  if (syncEnProgreso) {
    return { ok: false, mensaje: "Sync ya en progreso" };
  }

  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { ok: false, mensaje: "Sin conexión a internet" };
  }

  syncEnProgreso = true;
  let totalSincronizados = 0;
  const now = new Date().toISOString();

  try {
    for (const { table, name } of SYNC_TABLES) {
      const pendientes = await db
        .select()
        .from(table)
        .where(eq((table as any).synced, 0));

      if (pendientes.length === 0) {
        await db.insert(syncLog).values({
          id: generateId(),
          tabla: name,
          estado: "exitoso",
          registros: 0,
          errorMensaje: null,
          createdAt: now,
        });
        continue;
      }

      const pendientesSnake = pendientes.map(toSnakeCase);

      const { error } = await supabase
        .from(name)
        .upsert(pendientesSnake, { onConflict: "id" });

      if (error) {
        console.error(`Error sync tabla ${name}:`, error.message);
        await db.insert(syncLog).values({
          id: generateId(),
          tabla: name,
          estado: "fallido",
          registros: 0,
          errorMensaje: error.message,
          createdAt: now,
        });
        continue;
      }

      for (const registro of pendientes) {
        await db
          .update(table)
          .set({ synced: 1 } as any)
          .where(eq((table as any).id, (registro as any).id));
      }

      await db.insert(syncLog).values({
        id: generateId(),
        tabla: name,
        estado: "exitoso",
        registros: pendientes.length,
        errorMensaje: null,
        createdAt: now,
      });

      totalSincronizados += pendientes.length;
    }

    return {
      ok: true,
      mensaje: `${totalSincronizados} registros sincronizados`,
    };
  } catch (error) {
    console.error("Error en sync:", error);
    return { ok: false, mensaje: "Error durante la sincronización" };
  } finally {
    syncEnProgreso = false;
  }
}

export function iniciarSyncAutomatico(intervalMs = 60000): () => void {
  if (!isSupabaseConfigured) return () => {};

  const interval = setInterval(async () => {
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      await sincronizar();
    }
  }, intervalMs);

  return () => clearInterval(interval);
}

export async function contarPendientes(): Promise<Record<string, number>> {
  const resultado: Record<string, number> = {};

  for (const { table, name } of SYNC_TABLES) {
    const [fila] = await db
      .select({ total: count() })
      .from(table)
      .where(eq((table as any).synced, 0));

    resultado[name] = fila?.total ?? 0;
  }

  return resultado;
}

export async function obtenerUltimosSyncLogs(): Promise<
  Record<string, typeof syncLog.$inferSelect | null>
> {
  const resultado: Record<string, typeof syncLog.$inferSelect | null> = {};

  for (const { name } of SYNC_TABLES) {
    const [log] = await db
      .select()
      .from(syncLog)
      .where(eq(syncLog.tabla, name))
      .orderBy(desc(syncLog.createdAt))
      .limit(1);

    resultado[name] = log ?? null;
  }

  return resultado;
}
