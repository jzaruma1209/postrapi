import { sql } from "drizzle-orm";
import { db } from "./index";

// Ejecuta `fn` como una sola transacción: si algo falla, se deshace todo.
// No se usa db.transaction() porque drizzle-orm/expo-sqlite solo admite callbacks
// síncronos y con funciones async daba errores (por eso antes se había quitado).
// Si ya hay una transacción abierta (p. ej. anularPedido -> anularVenta), se une a esa.
let profundidad = 0;

export async function conTransaccion<T>(fn: () => Promise<T>): Promise<T> {
  if (profundidad > 0) return fn();

  await db.run(sql`BEGIN`);
  profundidad++;
  try {
    const resultado = await fn();
    await db.run(sql`COMMIT`);
    return resultado;
  } catch (error) {
    try {
      await db.run(sql`ROLLBACK`);
    } catch {
      // si el rollback falla, la conexión ya cerró la transacción
    }
    throw error;
  } finally {
    profundidad--;
  }
}
