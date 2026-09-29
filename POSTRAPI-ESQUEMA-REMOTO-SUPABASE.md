# Postrapi — Esquema de Base de Datos Remota (Supabase)

> Documento de referencia para agentes. Describe únicamente la base de datos
> remota en Supabase: qué tablas existen, qué campos tiene cada una, qué
> tipo de dato es cada campo, y cómo se relacionan entre sí.
>
> Fuente: `CREATE TABLE` real exportado de Supabase (esquema `public`).

---

## 1. Idea general

La base remota tiene **11 tablas**. Todas siguen el mismo patrón base:

- `id` (`text`) — clave primaria, es un UUID generado en la app.
- `created_at` (`text`) — fecha de creación en formato ISO string.
- `synced` (`integer`, default `1`) — bandera de sincronización (en remoto
  siempre queda en 1, porque si el registro está en Supabase es porque ya se
  sincronizó).

Estos tres campos no se repiten en las tablas de abajo para no ser
redundante — asumir que **todas las tablas los tienen**, además de los campos
propios que se detallan.

---

## 2. Tablas

### `productos`
Catálogo de productos que se venden.

| Campo | Tipo | Notas |
|---|---|---|
| nombre | text | NOT NULL |
| precio | real | NOT NULL |
| imagen_url | text | opcional |
| activo | integer | NOT NULL, default `1` (funciona como booleano) |

No tiene relaciones hacia otras tablas.

---

### `ingredientes`
Insumos de bodega/inventario.

| Campo | Tipo | Notas |
|---|---|---|
| nombre | text | NOT NULL |
| unidad | text | NOT NULL (ej: kg, g, litros, unidades) |
| stock_actual | real | NOT NULL, default `0` |
| stock_minimo | real | NOT NULL, default `0` |

No tiene relaciones hacia otras tablas.

---

### `recetas`
Define qué ingredientes (y en qué cantidad) lleva cada producto. Es la tabla
puente entre `productos` e `ingredientes`.

| Campo | Tipo | Notas |
|---|---|---|
| producto_id | text | FK → `productos.id` |
| ingrediente_id | text | FK → `ingredientes.id` |
| cantidad | real | NOT NULL |

---

### `pedidos`
Pedidos de clientes (para llevar, whatsapp, etc. — no son ventas todavía).

| Campo | Tipo | Notas |
|---|---|---|
| cliente_nombre | text | opcional |
| nota | text | opcional |
| origen | text | NOT NULL |
| estado | text | NOT NULL, default `'pendiente'` — valores: `pendiente`, `preparando`, `entregado`, `anulado` |
| entregado_at | text | opcional, se llena cuando el pedido se entrega |
| anulado_at | text | opcional, se llena cuando el pedido se anula |
| motivo_anulacion | text | opcional, texto libre requerido al anular |

No tiene relaciones hacia otras tablas (es referenciada por `pedido_items` y
opcionalmente por `ventas`).

---

### `pedido_items`
Detalle de productos dentro de un pedido.

| Campo | Tipo | Notas |
|---|---|---|
| pedido_id | text | FK → `pedidos.id` |
| producto_id | text | FK → `productos.id` |
| cantidad | integer | NOT NULL |

---

### `ventas`
Registro de una venta ya cobrada.

| Campo | Tipo | Notas |
|---|---|---|
| total | real | NOT NULL — monto final cobrado (post-descuento) |
| metodo_pago | text | NOT NULL (ej: efectivo, transferencia) |
| pedido_id | text | FK → `pedidos.id`, opcional (una venta puede o no venir de un pedido) |
| subtotal | real | opcional — suma bruta de items antes de aplicar descuento |
| descuento_tipo | text | opcional — `'monto'` o `'porcentaje'` |
| descuento_valor | real | default `0` |
| anulada | integer | NOT NULL, default `0` — `1` = anulada |
| anulada_at | text | opcional, timestamp de anulación |
| motivo_anulacion | text | opcional, motivo libre al anular |

---

### `venta_items`
Detalle de productos dentro de una venta.

| Campo | Tipo | Notas |
|---|---|---|
| venta_id | text | FK → `ventas.id` |
| producto_id | text | FK → `productos.id` |
| cantidad | integer | NOT NULL |
| precio_unitario | real | NOT NULL |
| subtotal | real | NOT NULL |

---

### `movimientos_inventario`
Historial de entradas/salidas de stock de ingredientes.

| Campo | Tipo | Notas |
|---|---|---|
| ingrediente_id | text | FK → `ingredientes.id` |
| tipo | text | NOT NULL — valores: `compra`, `ajuste`, `descuento_venta`, `devolucion_anulacion` |
| cantidad | real | NOT NULL, positivo = ingresa, negativo = sale |
| motivo | text | opcional |
| referencia_id | text | opcional, apunta al registro que originó el movimiento (ej: una venta o una compra) |

---

### `compras`
Compras de ingredientes a proveedores.

| Campo | Tipo | Notas |
|---|---|---|
| ingrediente_id | text | FK → `ingredientes.id` |
| cantidad | real | NOT NULL |
| costo_total | real | NOT NULL |
| fecha | text | NOT NULL |

---

### `gastos`
Gastos generales del negocio (no ligados a ingredientes).

| Campo | Tipo | Notas |
|---|---|---|
| concepto | text | NOT NULL |
| monto | real | NOT NULL |
| categoria | text | NOT NULL (ej: servicios, personal, transporte, otro) |
| fecha | text | NOT NULL |

No tiene relaciones hacia otras tablas.

---

### `caja_diaria`
Control de apertura/cierre de caja por día.

| Campo | Tipo | Notas |
|---|---|---|
| monto_inicial | real | NOT NULL |
| monto_declarado_efectivo | real | opcional, conteo físico de efectivo al cierre |
| monto_declarado_transferencia | real | opcional, total declarado de transferencias al cierre |
| fecha | text | NOT NULL |
| cerrada_at | text | opcional, se llena cuando se cierra la caja |

No tiene relaciones hacia otras tablas.

---

## 3. Mapa de relaciones (resumen)

```
productos ──┬── recetas ── ingredientes ──┬── compras
            │                             └── movimientos_inventario
            ├── pedido_items ── pedidos ── ventas
            └── venta_items ── ventas

gastos          → tabla independiente
caja_diaria     → tabla independiente
```

- `recetas` conecta `productos` con `ingredientes` (many-to-many vía tabla
  puente).
- `pedidos` puede tener muchos `pedido_items`, cada uno apunta a un
  `producto`.
- `ventas` puede tener muchos `venta_items`, cada uno apunta a un
  `producto`. Una `venta` puede opcionalmente venir de un `pedido`.
- `movimientos_inventario` y `compras` afectan el stock de `ingredientes`,
  cada movimiento puede referenciar (`referencia_id`
---

## SQL real (exportado de Supabase)

```sql
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.productos (
  id text NOT NULL,
  nombre text NOT NULL,
  precio real NOT NULL,
  imagen_url text,
  activo integer NOT NULL DEFAULT 1,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ingredientes (
  id text NOT NULL,
  nombre text NOT NULL,
  unidad text NOT NULL,
  stock_actual real NOT NULL DEFAULT 0,
  stock_minimo real NOT NULL DEFAULT 0,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  CONSTRAINT ingredientes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recetas (
  id text NOT NULL,
  producto_id text,
  ingrediente_id text,
  cantidad real NOT NULL,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  CONSTRAINT recetas_pkey PRIMARY KEY (id),
  CONSTRAINT recetas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id),
  CONSTRAINT recetas_ingrediente_id_fkey FOREIGN KEY (ingrediente_id) REFERENCES public.ingredientes(id)
);
CREATE TABLE public.pedidos (
  id text NOT NULL,
  cliente_nombre text,
  nota text,
  origen text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente'::text,
  created_at text NOT NULL,
  entregado_at text,
  synced integer NOT NULL DEFAULT 1,
  anulado_at text,
  motivo_anulacion text,
  CONSTRAINT pedidos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pedido_items (
  id text NOT NULL,
  pedido_id text,
  producto_id text,
  cantidad integer NOT NULL,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  CONSTRAINT pedido_items_pkey PRIMARY KEY (id),
  CONSTRAINT pedido_items_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id),
  CONSTRAINT pedido_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.ventas (
  id text NOT NULL,
  total real NOT NULL,
  metodo_pago text NOT NULL,
  pedido_id text,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  subtotal real,
  descuento_tipo text,
  descuento_valor real DEFAULT 0,
  anulada integer NOT NULL DEFAULT 0,
  anulada_at text,
  motivo_anulacion text,
  CONSTRAINT ventas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.venta_items (
  id text NOT NULL,
  venta_id text,
  producto_id text,
  cantidad integer NOT NULL,
  precio_unitario real NOT NULL,
  subtotal real NOT NULL,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  CONSTRAINT venta_items_pkey PRIMARY KEY (id),
  CONSTRAINT venta_items_venta_id_fkey FOREIGN KEY (venta_id) REFERENCES public.ventas(id),
  CONSTRAINT venta_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id)
);
CREATE TABLE public.movimientos_inventario (
  id text NOT NULL,
  ingrediente_id text,
  tipo text NOT NULL,
  cantidad real NOT NULL,
  motivo text,
  referencia_id text,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_inventario_ingrediente_id_fkey FOREIGN KEY (ingrediente_id) REFERENCES public.ingredientes(id)
);
CREATE TABLE public.compras (
  id text NOT NULL,
  ingrediente_id text,
  cantidad real NOT NULL,
  costo_total real NOT NULL,
  fecha text NOT NULL,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  CONSTRAINT compras_pkey PRIMARY KEY (id),
  CONSTRAINT compras_ingrediente_id_fkey FOREIGN KEY (ingrediente_id) REFERENCES public.ingredientes(id)
);
CREATE TABLE public.gastos (
  id text NOT NULL,
  concepto text NOT NULL,
  monto real NOT NULL,
  categoria text NOT NULL,
  fecha text NOT NULL,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  CONSTRAINT gastos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.caja_diaria (
  id text NOT NULL,
  monto_inicial real NOT NULL,
  monto_declarado_efectivo real,
  fecha text NOT NULL,
  cerrada_at text,
  created_at text NOT NULL,
  synced integer NOT NULL DEFAULT 1,
  monto_declarado_transferencia real,
  CONSTRAINT caja_diaria_pkey PRIMARY KEY (id)
);
```
