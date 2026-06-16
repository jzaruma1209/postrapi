import { db } from "../index";
import { sql } from "drizzle-orm";

export async function runMigrations(): Promise<void> {
  await db.run(sql`PRAGMA journal_mode = WAL;`);
  await db.run(sql`PRAGMA foreign_keys = ON;`);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS productos (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      imagen_url TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS ingredientes (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      unidad TEXT NOT NULL,
      stock_actual REAL NOT NULL DEFAULT 0,
      stock_minimo REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS recetas (
      id TEXT PRIMARY KEY,
      producto_id TEXT NOT NULL REFERENCES productos(id),
      ingrediente_id TEXT NOT NULL REFERENCES ingredientes(id),
      cantidad REAL NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS pedidos (
      id TEXT PRIMARY KEY,
      cliente_nombre TEXT,
      nota TEXT,
      origen TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      created_at TEXT NOT NULL,
      entregado_at TEXT,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS pedido_items (
      id TEXT PRIMARY KEY,
      pedido_id TEXT NOT NULL REFERENCES pedidos(id),
      producto_id TEXT NOT NULL REFERENCES productos(id),
      cantidad INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS ventas (
      id TEXT PRIMARY KEY,
      total REAL NOT NULL,
      metodo_pago TEXT NOT NULL,
      pedido_id TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS venta_items (
      id TEXT PRIMARY KEY,
      venta_id TEXT NOT NULL REFERENCES ventas(id),
      producto_id TEXT NOT NULL REFERENCES productos(id),
      cantidad INTEGER NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS movimientos_inventario (
      id TEXT PRIMARY KEY,
      ingrediente_id TEXT NOT NULL REFERENCES ingredientes(id),
      tipo TEXT NOT NULL,
      cantidad REAL NOT NULL,
      motivo TEXT,
      referencia_id TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS compras (
      id TEXT PRIMARY KEY,
      ingrediente_id TEXT NOT NULL REFERENCES ingredientes(id),
      cantidad REAL NOT NULL,
      costo_total REAL NOT NULL,
      fecha TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY,
      concepto TEXT NOT NULL,
      monto REAL NOT NULL,
      categoria TEXT NOT NULL,
      fecha TEXT NOT NULL,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS caja_diaria (
      id TEXT PRIMARY KEY,
      monto_inicial REAL NOT NULL,
      monto_declarado REAL,
      fecha TEXT NOT NULL,
      cerrada_at TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS configuracion (
      clave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );
  `);

  // Insertar configuración por defecto si no existe
  await db.run(sql`
    INSERT OR IGNORE INTO configuracion (clave, valor) VALUES
      ('nombre_negocio', 'Mi Negocio'),
      ('moneda', '$'),
      ('stock_minimo_default', '1'),
      ('impresora_mac', ''),
      ('pin_hash', '');
  `);

  console.log("✅ Migrations ejecutadas correctamente");
}
