# Postrapi — Esquema de Base de Datos Local (SQLite)

> Documento de referencia para agentes. Describe únicamente la base de datos
> local: archivo SQLite embebido en el dispositivo, gestionado por
> `expo-sqlite` + Drizzle ORM. Qué tablas existen, qué campos tiene cada una,
> qué tipo de dato es cada campo, y cómo se relacionan entre sí.
>
> Fuente: `src/db/migrations/0000_pretty_roughhouse.sql` (migración real
> generada por Drizzle, es lo que efectivamente se ejecuta contra el archivo
> `.db` en el dispositivo).

---

## 1. Idea general

La base local tiene **12 tablas** (una más que la remota: `configuracion`,
que nunca sale del dispositivo).

Todas las tablas — excepto `configuracion` — comparten este patrón base:

- `id` (`text`) — clave primaria, UUID generado en la app.
- `created_at` (`text`) — fecha de creación en formato ISO string.
- `synced` (`integer`, default **`0`**) — bandera de sincronización. Nace en
  `0` (no sincronizado) y `sync.service.ts` la pasa a `1` cuando el registro
  ya subió a Supabase con éxito. *(En Supabase esta misma columna existe pero
  con default `1`, porque si el registro está ahí es porque ya se
  sincronizó — es coherente, no es un error.)*

---

| Campo | Tipo | Notas |
|---|---|---|
| nombre | text | NOT NULL |
| precio | real | NOT NULL |
| imagen_url | text | opcional |
| activo | integer | NOT NULL, default `1` |

---

### `ingredientes`
| Campo | Tipo | Notas |
|---|---|---|
| nombre | text | NOT NULL |
| unidad | text | NOT NULL |
| stock_actual | real | NOT NULL, default `0` |
| stock_minimo | real | NOT NULL, default `0` |

---

### `recetas`
Tabla puente entre `productos` e `ingredientes`.

| Campo | Tipo | Notas |
|---|---|---|
| producto_id | text | NOT NULL, FK → `productos.id` |
| ingrediente_id | text | NOT NULL, FK → `ingredientes.id` |
| cantidad | real | NOT NULL |

---

### `pedidos`
| Campo | Tipo | Notas |
|---|---|---|
| cliente_nombre | text | opcional |
| nota | text | opcional |
| origen | text | NOT NULL |
| estado | text | NOT NULL, default `'pendiente'` — valores: `pendiente`, `preparando`, `entregado`, `anulado` |
| entregado_at | text | opcional |
| anulado_at | text | opcional — se rellena al anular |
| motivo_anulacion | text | opcional — texto libre requerido al anular |

---

### `pedido_items`
| Campo | Tipo | Notas |
|---|---|---|
| pedido_id | text | NOT NULL, FK → `pedidos.id` |
| producto_id | text | NOT NULL, FK → `productos.id` |
| cantidad | integer | NOT NULL |

---

### `ventas`
| Campo | Tipo | Notas |
|---|---|---|
| total | real | NOT NULL — monto final cobrado (post-descuento) |
| metodo_pago | text | NOT NULL |
| pedido_id | text | opcional, FK → `pedidos.id` |
| subtotal | real | opcional — suma bruta de items antes de descuento |
| descuento_tipo | text | opcional — `'monto'` o `'porcentaje'` |
| descuento_valor | real | default `0` |
| anulada | integer | NOT NULL, default `0` — `1` = anulada |
| anulada_at | text | opcional — timestamp de anulación |
| motivo_anulacion | text | opcional — texto libre al anular |

---

### `venta_items`
| Campo | Tipo | Notas |
|---|---|---|
| venta_id | text | NOT NULL, FK → `ventas.id` |
| producto_id | text | NOT NULL, FK → `productos.id` |
| cantidad | integer | NOT NULL |
| precio_unitario | real | NOT NULL |
| subtotal | real | NOT NULL |

---

### `movimientos_inventario`
| Campo | Tipo | Notas |
|---|---|---|
| ingrediente_id | text | NOT NULL, FK → `ingredientes.id` |
| tipo | text | NOT NULL — valores: `descuento_venta`, `ajuste`, `compra`, `devolucion_anulacion` |
| cantidad | real | NOT NULL — positivo = ingresa, negativo = sale |
| motivo | text | opcional |
| referencia_id | text | opcional — ventaId o pedidoId que originó el movimiento |

---

### `compras`
| Campo | Tipo | Notas |
|---|---|---|
| ingrediente_id | text | NOT NULL, FK → `ingredientes.id` |
| cantidad | real | NOT NULL |
| costo_total | real | NOT NULL |
| fecha | text | NOT NULL |

---

### `gastos`
| Campo | Tipo | Notas |
|---|---|---|
| concepto | text | NOT NULL |
| monto | real | NOT NULL |
| categoria | text | NOT NULL |
| fecha | text | NOT NULL |

---

### `caja_diaria`
| Campo | Tipo | Notas |
|---|---|---|
| monto_inicial | real | NOT NULL |
| monto_declarado_efectivo | real | opcional — conteo físico de efectivo al cierre |
| monto_declarado_transferencia | real | opcional — total declarado de transferencias al cierre |
| fecha | text | NOT NULL |
| cerrada_at | text | opcional |

> ⚠️ **Nota:** el campo original era `monto_declarado`. Ahora es **dos campos separados**: uno
> para efectivo y otro para transferencia, permitiendo cuadre por método de pago.

---

### `configuracion` — exclusiva de local
Única tabla con estructura distinta al patrón general: **no tiene**
`id`/`created_at`/`synced`. Su PK es `clave`.

| Campo | Tipo | Notas |
|---|---|---|
| clave | text | PRIMARY KEY |
| valor | text | NOT NULL |

Guarda pares clave-valor: `nombre_negocio`, `moneda`, `stock_minimo_default`,
`impresora_mac`, `pin_hash`. **Nunca se sincroniza a Supabase** (contiene el
hash del PIN de seguridad).

---

## 3. Mapa de relaciones (resumen)

```
productos ──┬── recetas ── ingredientes ──┬── compras
           │                             └── movimientos_inventario
           ├── pedido_items ── pedidos ── ventas
           └── venta_items ── ventas

gastos          → tabla independiente
caja_diaria     → tabla independiente
configuracion   → tabla independiente, solo local, nunca sincroniza
```

Es idéntico al mapa de relaciones remoto, más `configuracion` como tabla
adicional exclusiva de local.

---

## 4. Confirmación de consistencia con Supabase

Comparado contra el `CREATE TABLE` real de Supabase: **los nombres de las 11
tablas sincronizables y de todas sus columnas coinciden exactamente**, incluyendo
los campos de anulación y descuento agregados en la migración
`0002_anulacion_descuento.sql`.

Diferencias estructurales documentadas:
- `synced` nace en `0` en local y en `1` en remoto — comportamiento esperado, no un bug.
- `configuracion` existe solo en local — nunca se crea ni sube a Supabase.
