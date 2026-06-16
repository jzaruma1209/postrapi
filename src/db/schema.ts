import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

// ─── PRODUCTOS ───────────────────────────────────────────
export const productos = sqliteTable("productos", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  precio: real("precio").notNull(),
  imagenUrl: text("imagen_url"),
  activo: integer("activo").notNull().default(1),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── INGREDIENTES ─────────────────────────────────────────
export const ingredientes = sqliteTable("ingredientes", {
  id: text("id").primaryKey(),
  nombre: text("nombre").notNull(),
  unidad: text("unidad").notNull(), // kg | g | litros | unidades
  stockActual: real("stock_actual").notNull().default(0),
  stockMinimo: real("stock_minimo").notNull().default(0),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── RECETAS ──────────────────────────────────────────────
export const recetas = sqliteTable("recetas", {
  id: text("id").primaryKey(),
  productoId: text("producto_id")
    .notNull()
    .references(() => productos.id),
  ingredienteId: text("ingrediente_id")
    .notNull()
    .references(() => ingredientes.id),
  cantidad: real("cantidad").notNull(),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── PEDIDOS ──────────────────────────────────────────────
export const pedidos = sqliteTable("pedidos", {
  id: text("id").primaryKey(),
  clienteNombre: text("cliente_nombre"),
  nota: text("nota"),
  origen: text("origen").notNull(), // en_persona | whatsapp | llamada
  estado: text("estado").notNull().default("pendiente"), // pendiente | preparando | entregado
  created_at: text("created_at").notNull(),
  entregado_at: text("entregado_at"),
  synced: integer("synced").notNull().default(0),
});

// ─── PEDIDO ITEMS ─────────────────────────────────────────
export const pedidoItems = sqliteTable("pedido_items", {
  id: text("id").primaryKey(),
  pedidoId: text("pedido_id")
    .notNull()
    .references(() => pedidos.id),
  productoId: text("producto_id")
    .notNull()
    .references(() => productos.id),
  cantidad: integer("cantidad").notNull(),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── VENTAS ───────────────────────────────────────────────
export const ventas = sqliteTable("ventas", {
  id: text("id").primaryKey(),
  total: real("total").notNull(),
  metodoPago: text("metodo_pago").notNull(), // efectivo | transferencia
  pedidoId: text("pedido_id"),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── VENTA ITEMS ──────────────────────────────────────────
export const ventaItems = sqliteTable("venta_items", {
  id: text("id").primaryKey(),
  ventaId: text("venta_id")
    .notNull()
    .references(() => ventas.id),
  productoId: text("producto_id")
    .notNull()
    .references(() => productos.id),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: real("precio_unitario").notNull(),
  subtotal: real("subtotal").notNull(),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── MOVIMIENTOS DE INVENTARIO ────────────────────────────
export const movimientosInventario = sqliteTable("movimientos_inventario", {
  id: text("id").primaryKey(),
  ingredienteId: text("ingrediente_id")
    .notNull()
    .references(() => ingredientes.id),
  tipo: text("tipo").notNull(), // compra | ajuste | descuento_venta
  cantidad: real("cantidad").notNull(), // positivo=entrada, negativo=salida
  motivo: text("motivo"),
  referenciaId: text("referencia_id"),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── COMPRAS ──────────────────────────────────────────────
export const compras = sqliteTable("compras", {
  id: text("id").primaryKey(),
  ingredienteId: text("ingrediente_id")
    .notNull()
    .references(() => ingredientes.id),
  cantidad: real("cantidad").notNull(),
  costoTotal: real("costo_total").notNull(),
  fecha: text("fecha").notNull(),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── GASTOS ───────────────────────────────────────────────
export const gastos = sqliteTable("gastos", {
  id: text("id").primaryKey(),
  concepto: text("concepto").notNull(),
  monto: real("monto").notNull(),
  categoria: text("categoria").notNull(), // servicios | personal | transporte | otro
  fecha: text("fecha").notNull(),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── CAJA DIARIA ──────────────────────────────────────────
export const cajaDiaria = sqliteTable("caja_diaria", {
  id: text("id").primaryKey(),
  montoInicial: real("monto_inicial").notNull(),
  montoDeclarado: real("monto_declarado"),
  fecha: text("fecha").notNull(),
  cerrada_at: text("cerrada_at"),
  created_at: text("created_at").notNull(),
  synced: integer("synced").notNull().default(0),
});

// ─── CONFIGURACION ────────────────────────────────────────
export const configuracion = sqliteTable("configuracion", {
  clave: text("clave").primaryKey(),
  valor: text("valor").notNull(),
});

// ─── TIPOS INFERIDOS ──────────────────────────────────────
export type Producto = typeof productos.$inferSelect;
export type NuevoProducto = typeof productos.$inferInsert;
export type Ingrediente = typeof ingredientes.$inferSelect;
export type NuevoIngrediente = typeof ingredientes.$inferInsert;
export type Receta = typeof recetas.$inferSelect;
export type NuevaReceta = typeof recetas.$inferInsert;
export type Pedido = typeof pedidos.$inferSelect;
export type NuevoPedido = typeof pedidos.$inferInsert;
export type PedidoItem = typeof pedidoItems.$inferSelect;
export type Venta = typeof ventas.$inferSelect;
export type NuevaVenta = typeof ventas.$inferInsert;
export type VentaItem = typeof ventaItems.$inferSelect;
export type MovimientoInventario = typeof movimientosInventario.$inferSelect;
export type Compra = typeof compras.$inferSelect;
export type NuevaCompra = typeof compras.$inferInsert;
export type Gasto = typeof gastos.$inferSelect;
export type NuevoGasto = typeof gastos.$inferInsert;
export type CajaDiaria = typeof cajaDiaria.$inferSelect;
