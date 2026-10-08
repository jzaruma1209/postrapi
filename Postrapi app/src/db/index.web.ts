import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

// En web se usa la API async de expo-sqlite en lugar de la síncrona que usa
// drizzle-orm/expo-sqlite en nativo. La API síncrona de expo-sqlite en web
// tiene dos fallas (presentes en v16 y v57):
//  - escribe el largo del resultado en un Uint8Array, así que cualquier
//    resultado de más de 255 bytes llega truncado ("Unterminated string in JSON");
//  - espera la respuesta del worker con un timeout de pocos milisegundos, así que
//    la primera llamada falla mientras el worker carga wa-sqlite
//    ("Sync operation timeout").
const sqlitePromise = SQLite.openDatabaseAsync("postrapi.db");

export const db = drizzle(
  async (query, params, method) => {
    const sqlite = await sqlitePromise;
    const statement = await sqlite.prepareAsync(query);
    try {
      const result = await statement.executeForRawResultAsync(params);
      if (method === "run") return { rows: [] };
      const rows = await result.getAllAsync();
      return { rows: method === "get" ? rows[0] : rows };
    } finally {
      await statement.finalizeAsync();
    }
  },
  { schema }
);
export type DB = typeof db;
