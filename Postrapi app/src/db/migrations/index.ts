import { db } from "../index";
import { sql } from "drizzle-orm";

export async function runMigrations(): Promise<void> {
  try {
    await db.run(sql`PRAGMA journal_mode = WAL;`);
  } catch {
    // WAL mode no soportado en esta plataforma, continúa sin WAL
  }
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
      monto_declarado_efectivo REAL,
      monto_declarado_transferencia REAL,
      fecha TEXT NOT NULL,
      cerrada_at TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Migración 0001: renombrar columna (solo si la vieja aún existe)
  try {
    await db.run(sql`
      ALTER TABLE caja_diaria RENAME COLUMN monto_declarado TO monto_declarado_efectivo;
    `);
  } catch {
    // columna ya renombrada o no existe
  }
  try {
    await db.run(sql`
      ALTER TABLE caja_diaria ADD COLUMN monto_declarado_transferencia REAL;
    `);
  } catch {
    // columna ya existe
  }

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
      ('pin_hash', '9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0'),
      ('tema', 'oscuro');
  `);

  // Actualizar pin_hash vacío de instalaciones existentes
  await db.run(sql`
    UPDATE configuracion SET valor = '9af15b336e6a9619928537df30b2e6a2376569fcf9d7e773eccede65606529a0'
    WHERE clave = 'pin_hash' AND (valor IS NULL OR valor = '');
  `);

  // Migración 0002: anulación y descuento en ventas + anulación en pedidos
  try {
    await db.run(sql`ALTER TABLE ventas ADD COLUMN subtotal REAL NOT NULL DEFAULT 0;`);
  } catch { /* columna ya existe */ }
  try {
    await db.run(sql`ALTER TABLE ventas ADD COLUMN descuento_tipo TEXT;`);
  } catch { /* columna ya existe */ }
  try {
    await db.run(sql`ALTER TABLE ventas ADD COLUMN descuento_valor REAL DEFAULT 0;`);
  } catch { /* columna ya existe */ }
  try {
    await db.run(sql`ALTER TABLE ventas ADD COLUMN anulada INTEGER NOT NULL DEFAULT 0;`);
  } catch { /* columna ya existe */ }
  try {
    await db.run(sql`ALTER TABLE ventas ADD COLUMN anulada_at TEXT;`);
  } catch { /* columna ya existe */ }
  try {
    await db.run(sql`ALTER TABLE ventas ADD COLUMN motivo_anulacion TEXT;`);
  } catch { /* columna ya existe */ }
  try {
    await db.run(sql`ALTER TABLE pedidos ADD COLUMN anulado_at TEXT;`);
  } catch { /* columna ya existe */ }
  try {
    await db.run(sql`ALTER TABLE pedidos ADD COLUMN motivo_anulacion TEXT;`);
  } catch { /* columna ya existe */ }

  // Migración 0003: categoría en productos
  try {
    await db.run(sql`ALTER TABLE productos ADD COLUMN categoria TEXT NOT NULL DEFAULT 'combo';`);
  } catch { /* columna ya existe */ }

  // Migración 0004: tabla de log de sincronización (solo local)
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS sync_log (
      id TEXT PRIMARY KEY,
      tabla TEXT NOT NULL,
      estado TEXT NOT NULL,
      registros INTEGER NOT NULL DEFAULT 0,
      error_mensaje TEXT,
      created_at TEXT NOT NULL
    );
  `);

  console.log("✅ Migrations ejecutadas correctamente");
}
