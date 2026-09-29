# Postrapi — Documentación de Arquitectura, Flujos y Guía de Verificación/Testing

> Este documento consolida las 14 tareas de construcción (TASK-01 a TASK-14) y el DESIGN_SYSTEM.md
> en una sola referencia. Sirve para que un agente con acceso al código del proyecto:
> 1. **Verifique** que lo construido coincide con lo especificado aquí.
> 2. **Detecte** desviaciones, archivos faltantes o reglas de negocio rotas.
> 3. **Genere casos de prueba manuales** para confirmar que cada módulo funciona.

---

## 1. Resumen del proyecto

**Postrapi** es un POS (punto de venta) offline-first para un negocio de comida rápida.

- Plataforma: React Native + Expo SDK 54, Expo Router v3.
- Base de datos local: SQLite (`expo-sqlite`) vía Drizzle ORM. **La app opera 100% sin internet.**
- Backup/sync: Supabase, **unidireccional** (SQLite → Supabase), nunca bloqueante, nunca obligatorio.
- Dark mode obligatorio, diseño "flat", optimizado para uso con una mano y pantalla sucia.
- Seguridad operativa: un PIN de 4 dígitos protege todas las acciones sensibles (ajustes de stock,
  compras, gastos, cambios de configuración, entrada al módulo Gestión).

### Filosofía de arquitectura
```
UI (pantallas / componentes)
   ↓ llama a
Services (lógica de negocio, transacciones SQL)
   ↓ usa
Schema / DB (Drizzle + SQLite)
   ↑ alimentado por
Stores (Zustand) — solo para estado efímero de UI (carrito), NO para datos persistentes
```
Regla de oro: **las pantallas nunca escriben SQL directamente para operaciones de negocio**
(ventas, inventario, pedidos, gastos). Siempre pasan por el service correspondiente. Las únicas
excepciones documentadas son CRUD simples de Productos/Recetas en Gestión (TASK-08), que sí golpean
`db` directo según lo especificado.

---

## 2. Stack tecnológico (instalado en TASK-01)

| Categoría | Librería |
|---|---|
| DB local | `expo-sqlite`, `drizzle-orm`, `drizzle-kit` (dev) |
| Routing | `expo-router` |
| Estado UI | `zustand` |
| Estilos | `nativewind` + `tailwindcss` |
| Backend remoto | `@supabase/supabase-js`, `react-native-url-polyfill` |
| IDs | `uuid` |
| Seguridad | `crypto-js` (hash SHA256 del PIN) |
| Red | `@react-native-community/netinfo` (TASK-07) |
| Impresión | `react-native-bluetooth-escpos-printer` (TASK-14) |

No debe haber dependencias instaladas fuera de esta lista sin justificación — TASK-01 lo prohíbe explícitamente.

---

## 3. Estructura de carpetas esperada

```
app/
  _layout.tsx                  → migrations + seeds + sync automático
  (tabs)/
    _layout.tsx                 → tab bar (5 tabs visibles: Resumen, Ventas, Pedidos, Bodega, Gestión)
    index.tsx                   → Resumen
    ventas/
      _layout.tsx  index.tsx (Nueva venta)  historial.tsx  caja.tsx  [id].tsx
    pedidos/
      _layout.tsx  index.tsx
    bodega/
      _layout.tsx  index.tsx
    gastos/
      _layout.tsx  index.tsx
    gestion/
      index.tsx  productos.tsx  recetas.tsx  pin.tsx  configuracion.tsx
src/
  db/
    index.ts  schema.ts  seeds.ts  migrations/index.ts
  services/
    ventas.service.ts  inventario.service.ts  pin.service.ts
    sync.service.ts  pedidos.service.ts  printer.service.ts
  stores/
    useVentasStore.ts  useInventarioStore.ts
  components/
    shared/PinModal.tsx  shared/TicketModal.tsx
  hooks/
    usePin.ts
  utils/
    types.ts  uuid.ts  dates.ts  calculos.ts
  supabase/
    client.ts
```

> ⚠️ Nota: TASK-01 crea `app/(tabs)/gastos/` como carpeta de tab independiente, pero el DESIGN_SYSTEM.md
> describe sólo 5 tabs (Resumen, Ventas, Pedidos, Bodega, Gestión) sin "Gastos" en el tab bar.
> **Verificar cuál de las dos versiones quedó implementada**: si Gastos es un tab visible de 6, o si
> quedó integrado/accesible desde otro lado (p. ej. dentro de Bodega o Gestión). Esto es una
> inconsistencia entre TASK-01/TASK-12 y DESIGN_SYSTEM.md que el agente de verificación debe señalar.

---

## 4. Modelo de datos (12 tablas — TASK-02)

Todas las tablas tienen `id TEXT` (UUID) como PK (excepto `configuracion`, que usa `clave TEXT` como PK),
`created_at TEXT` (ISO string) y `synced INTEGER DEFAULT 0` para el mecanismo de sync.

| Tabla | Campos clave | Relaciones |
|---|---|---|
| `productos` | nombre, precio, imagen_url, activo | — |
| `ingredientes` | nombre, unidad, stock_actual, stock_minimo | — |
| `recetas` | producto_id, ingrediente_id, cantidad | FK → productos, ingredientes |
| `pedidos` | cliente_nombre, nota, origen, estado, entregado_at, **anulado_at, motivo_anulacion** | — |
| `pedido_items` | pedido_id, producto_id, cantidad | FK → pedidos, productos |
| `ventas` | total, metodo_pago, pedido_id, **subtotal, descuento_tipo, descuento_valor, anulada, anulada_at, motivo_anulacion** | FK opcional → pedidos |
| `venta_items` | venta_id, producto_id, cantidad, precio_unitario, subtotal | FK → ventas, productos |
| `movimientos_inventario` | ingrediente_id, tipo, cantidad (+/-), motivo, referencia_id | FK → ingredientes |
| `compras` | ingrediente_id, cantidad, costo_total, fecha | FK → ingredientes |
| `gastos` | concepto, monto, categoria, fecha | — |
| `caja_diaria` | monto_inicial, **monto_declarado_efectivo, monto_declarado_transferencia**, fecha, cerrada_at | — |
| `configuracion` | clave (PK), valor | claves: nombre_negocio, moneda, stock_minimo_default, impresora_mac, pin_hash |

**Enums (en `src/utils/types.ts`):**
- `MetodoPago`: efectivo | transferencia
- `OrigenPedido`: en_persona | whatsapp | llamada
- `EstadoPedido`: pendiente | preparando | entregado | **anulado**
- `TipoMovimiento`: compra | ajuste | descuento_venta | **devolucion_anulacion**
- `CategoriaGasto`: servicios | personal | transporte | otro
- `UnidadMedida`: kg | g | litros | unidades
- `DescuentoTipo`: **monto | porcentaje**

**Migraciones:** se ejecutan a mano con `db.run(sql...)` dentro de `runMigrations()`, NO con
`drizzle-kit push` (incompatible con expo-sqlite en runtime). Se corren en `app/_layout.tsx` al
arrancar, antes de mostrar la UI (spinner naranja mientras corre).

**Seeds:** `runSeeds()` crea 8 ingredientes, 5 productos y sus recetas, sólo si la tabla `productos`
está vacía (chequeo `existing.length > 0` para evitar duplicar en cada arranque).

---

## 5. Services y sus contratos (lo que el agente debe verificar que existe y funciona así)

### 5.1 `ventas.service.ts` (TASK-04) — el más crítico
- `crearVenta({ items, metodoPago, pedidoId? })` → **todo dentro de `db.transaction()`**:
  1. Inserta en `ventas`.
  2. Inserta cada `venta_items`.
  3. Por cada item, busca su receta y **descuenta stock** de cada ingrediente (`stock_actual - cantidad`),
     registrando un `movimientos_inventario` tipo `descuento_venta` con cantidad negativa.
  4. Si viene `pedidoId`, marca ese pedido como `entregado` con `entregado_at`.
- `getVentasHoy()`, `getTotalVentasHoy()`, `getVentaConItems(id)`, `getHistorialVentas(fecha?)`.
- Caja: `abrirCaja(montoInicial)`, `cerrarCaja(cajaId, montoDeclarado)`, `getCajaHoy()`.
- `getTopProductosHoy(limit=3)`.
- **Regla dura:** nunca se debe poder confirmar una venta sin que el descuento de inventario ocurra en
  la misma transacción. Si se rompe esto, el stock queda desincronizado del histórico de ventas.

### 5.2 `inventario.service.ts` (TASK-05)
- CRUD de ingredientes: `getIngredientes`, `getIngredienteById`, `crearIngrediente`, `editarIngrediente`.
- `getIngredientesStockBajo()` → `stock_actual <= stock_minimo`.
- `ajustarStock({ ingredienteId, stockReal, motivo })` → transacción: inserta movimiento tipo `ajuste`
  (diferencia +/-) y actualiza `stock_actual` al valor contado físicamente. **Requiere PIN, pero el PIN
  se verifica en la UI, no dentro del service.**
- `registrarCompra({ ingredienteId, cantidad, costoTotal, fecha })` → transacción: inserta `compras`,
  inserta movimiento tipo `compra` (positivo), suma stock. **Requiere PIN en la UI.**
- `registrarGasto({ concepto, monto, categoria, fecha })`. **Requiere PIN en la UI.**
- `getCostoUnitarioPromedio(ingredienteId)` → promedio de las últimas 5 compras.
- `getCostoIngredientesHoy()` → recorre movimientos `descuento_venta` del día y multiplica por costo
  promedio — usado para la "ganancia estimada" del Resumen.
- **Regla dura:** estos services NUNCA validan el PIN ellos mismos. Si el agente encuentra
  `verificarPin` importado dentro de `inventario.service.ts`, es una desviación de la especificación
  (la verificación pertenece a la pantalla).

### 5.3 `pin.service.ts` (TASK-06)
- `hashPin(pin)` → SHA256 con `crypto-js`.
- `verificarPin(pin)` → si no hay PIN guardado en `configuracion.pin_hash`, **cualquier PIN de 4
  dígitos pasa** (primer uso). Si hay, compara hash.
- `cambiarPin(pinNuevo)` → valida 4 dígitos, guarda hash.
- `hayPinConfigurado()`.
- **Regla dura:** el PIN nunca se guarda ni se compara en texto plano.

### 5.4 `pedidos.service.ts` (TASK-10)
- `crearPedido({ items, clienteNombre?, nota?, origen })` → transacción: inserta `pedidos` (estado
  `pendiente`) + `pedido_items`.
- `cambiarEstadoPedido(id, estado)`.
- `entregarPedido(pedidoId, metodoPago)` → lee los items del pedido, resuelve precio actual de cada
  producto, y **llama a `crearVenta(..., pedidoId)`** del service de ventas (no duplica lógica de venta).
  Esto es lo que efectivamente descuenta inventario y marca el pedido como entregado.
- `getPedidosActivos()` → estado != entregado.
- `getPedidoItems(id)`, `getPedidosHoy()`.

### 5.5 `sync.service.ts` (TASK-07)
- `sincronizar()`: si Supabase no está configurado, o no hay internet (`NetInfo`), o ya hay un sync en
  progreso → retorna sin hacer nada (no bloquea, no lanza error visible).
  Si puede sincronizar: por cada tabla en `SYNC_TABLES` (todas excepto `configuracion`), sube los
  registros con `synced = 0` vía `upsert`, y si tiene éxito los marca `synced = 1` en SQLite local.
- `iniciarSyncAutomatico(intervalMs=60000)` → se llama una vez en `app/_layout.tsx` después de que la
  app esté lista (`ready`), corre cada 60s en background.
- **Regla dura:** `configuracion` (contiene el `pin_hash`) JAMÁS se sincroniza a Supabase.
- **Regla dura:** ningún flujo de venta/pedido/inventario depende de que el sync funcione. La app debe
  operar offline indefinidamente.

### 5.6 `printer.service.ts` (TASK-14)
- Import condicional de la librería bluetooth (`try/catch`) para no romper la app si no está disponible
  (p. ej. en desarrollo web).
- `hayImpresoraConfigurada()`, `getImpresoraMac()`, `conectarImpresora(mac)`, `imprimirTicket(datos)`,
  `escanearDispositivos()`.
- **Regla dura:** la impresora es 100% opcional. Sin impresora configurada, el flujo de venta y el
  `TicketModal` deben funcionar igual, simplemente sin botón "Imprimir". Una falla de impresión nunca
  debe crashear la app ni bloquear la venta (que ya se guardó en SQLite antes de intentar imprimir).

---

## 6. Flujos funcionales completos (de punta a punta)

### 6.1 Arranque de la app
```
app/_layout.tsx monta
  → runMigrations()   (crea 12 tablas si no existen, PRAGMA WAL + foreign_keys ON)
  → runSeeds()         (siembra datos de prueba solo si productos está vacío)
  → setReady(true)     (oculta spinner naranja, muestra Tabs)
  → iniciarSyncAutomatico(60000)  (en background, no bloquea)
```

### 6.2 Flujo de Venta directa (sin pedido)
```
Tab Ventas → grilla de productos activos (productos.activo = 1)
  → usuario toca "+" en producto → useVentasStore.agregarItem()
  → total del carrito se recalcula en tiempo real (Zustand, NO se persiste en SQLite)
  → aparece barra inferior "Cobrar ahora" / "Registrar pedido" (solo si carrito no está vacío)
  → "Cobrar ahora" → modal: resumen + selector método de pago → "Confirmar venta"
      → crearVenta({ items, metodoPago })  [transacción: venta + items + descuento stock]
      → limpiarCarrito()
      → se muestra TicketModal con los datos de la venta (TASK-14)
      → si hay impresora configurada, aparece botón "Imprimir"
```

### 6.3 Flujo de Pedido → Venta diferida
```
Tab Pedidos → "+ Nuevo" → modal con grid de productos + cliente/nota/origen
  → crearPedido() → estado "pendiente"
Lista de pedidos (chips: Todos/Pendiente/Preparando/Entregado)
  → pedido pendiente → botón "Preparando" → cambiarEstadoPedido(id, "preparando")
  → pedido preparando → botón "Entregar y cobrar" → modal método de pago
      → entregarPedido(pedidoId, metodoPago)
          → internamente llama a crearVenta(..., pedidoId)
          → esto descuenta inventario Y marca el pedido como "entregado" + entregado_at
```
**Punto crítico a verificar:** la pantalla de Pedidos NO debe construir la venta manualmente; debe
delegar siempre a `entregarPedido`, que a su vez delega a `crearVenta`. Si el agente encuentra lógica
de venta duplicada dentro de la pantalla de pedidos, es un bug respecto a la especificación.

### 6.4 Flujo de Inventario / Bodega
```
Tab Bodega → chips internos: Inventario / Compras / Ingredientes (NO son rutas separadas, es un
toggle de vista dentro de la misma pantalla)

Vista Inventario:
  lista ingredientes + barra de progreso + alerta ⚠ si stock_actual <= stock_minimo
  → tocar ingrediente → bottom sheet "Ajustar stock"
      → ingresar stock real contado + motivo (obligatorio)
      → "Guardar ajuste" → PinModal → PIN correcto → ajustarStock(...)
      → refresca lista

Vista Compras:
  → "+ Registrar compra" → selector ingrediente + cantidad + costo total + fecha
      → "Registrar" → PinModal → PIN correcto → registrarCompra(...)
      → refresca lista, total del día se recalcula

Vista Ingredientes:
  CRUD de ingredientes (nombre, unidad, stock mínimo), todas las escrituras piden PIN
```

### 6.5 Flujo de Gastos
```
Tab Gastos → "+ Gasto" → PinModal → PIN correcto → abre modal de registro
  → concepto + monto + categoría (toggle 4 opciones) + fecha
  → "Registrar gasto" → registrarGasto(...) → refresca lista + total del día
Chips de filtro por categoría: Todos/Servicios/Personal/Transporte/Otro
```

### 6.6 Flujo de Resumen (pantalla principal)
```
Al montar / al recibir foco (useFocusEffect):
  Promise.all([
    getTotalVentasHoy(), getTotalGastosHoy(), getCostoIngredientesHoy(),
    getPedidosActivos(), getIngredientesStockBajo(), getTopProductosHoy(3)
  ])
  ganancia = calcularGanancia(ventas, gastos, costoIngredientes)
  → 4 cards de métrica (Ventas naranja / Gastos rojo / Ganancia verde-o-rojo / Pendientes azul)
  → card alertas stock bajo (si hay, máx 3 + "+X más", toca → navega a Bodega)
  → card pedidos activos (si hay, toca → navega a Pedidos)
  → card top 3 productos del día (o "Aún no hay ventas hoy")
```

### 6.7 Flujo de Gestión (zona protegida)
```
Tab Gestión → SIEMPRE pide PIN al entrar (no solo en acciones puntuales)
  → cancelar PIN → vuelve al tab anterior
  → PIN correcto → menú 4 secciones: Productos / Recetas / PIN y Acceso / Configuración

Productos: CRUD directo (db.insert/update), activar/desactivar
Recetas: vincular/desvincular ingrediente-producto-cantidad (db.insert/delete sobre `recetas`)
PIN y Acceso: verificarPin(actual) + validar nuevo (4 dígitos) + coincide confirmación → cambiarPin()
Configuración: lee/escribe tabla `configuracion` (nombre_negocio, moneda, stock_minimo_default,
  impresora_mac vía toggle + escaneo bluetooth)
```

### 6.8 Flujo de Sincronización
```
Cada 60s (o llamada manual si existe botón en alguna pantalla):
  sincronizar()
    → si falta Supabase configurado / sin internet / ya en progreso → no-op silencioso
    → por cada tabla SYNC_TABLES (todas excepto configuracion):
        sube registros con synced=0 (upsert por id)
        marca synced=1 localmente si subió bien
```

---

## 7. Reglas de negocio críticas (no negociables)

1. `crearVenta` SIEMPRE corre dentro de una transacción SQLite única (venta + items + descuento stock + entrega de pedido si aplica).
2. El stock de un ingrediente solo cambia a través de: descuento por venta, ajuste manual, o compra — siempre vía `movimientos_inventario` + actualización de `stock_actual`, nunca con un `UPDATE` suelto sin registrar el movimiento.
3. El PIN se verifica **en la UI**, nunca dentro de los services de negocio.
4. El PIN nunca se almacena ni se transmite en texto plano (solo hash SHA256).
5. La tabla `configuracion` nunca se sube a Supabase.
6. Ninguna funcionalidad de venta, pedido, inventario o gasto depende de tener internet o Supabase configurado.
7. El carrito de venta vive solo en memoria (Zustand), nunca se persiste en SQLite.
8. `entregarPedido` reutiliza `crearVenta`; nunca debe haber una segunda implementación de "crear venta" en el módulo de pedidos.
9. La impresora es opcional en todo momento; su falla nunca bloquea ni crashea el flujo de venta.
10. Las migraciones se escriben a mano en `migrations/index.ts`, nunca con `drizzle-kit push`.

---

## 8. Design system — resumen rápido (DESIGN_SYSTEM.md)

| Token | Valor |
|---|---|
| Fondo pantalla | `#141414` |
| Fondo card | `#1e1e1e` |
| Fondo elevado (chips/inputs) | `#2a2a2a` |
| Acento principal (botones/precios) | `#F97316` (naranja) |
| Info / Preparando | `#38bdf8` |
| Éxito / Entregado / ganancia | `#22c55e` |
| Peligro / stock bajo / gastos | `#ef4444` |

- Cards flotantes con borde izquierdo de 3px de color según estado (naranja=pendiente, azul=preparando, verde=entregado, rojo=alerta).
- Border-radius: 14px cards, 10px botones, 20px chips/badges (pill).
- Tab bar: 5 tabs (Resumen, Ventas, Pedidos, Bodega, Gestión) — **verificar si Gastos quedó como 6º tab o integrado en otro módulo** (ver nota de la sección 3).
- Modal de PIN: overlay `rgba(0,0,0,0.85)`, teclado numérico 3x4, puntos como indicador (nunca dígitos visibles).

---

## 9. Mapa de tareas → entregables

| Tarea | Entregable principal | Depende de |
|---|---|---|
| TASK-01 | Setup, deps, NativeWind, tabs placeholder | — |
| TASK-02 | Schema + migrations (12 tablas) | 01 |
| TASK-03 | Seeds (8 ingredientes, 5 productos, recetas) | 01, 02 |
| TASK-04 | `ventas.service.ts` + `useVentasStore` | 02, 03 |
| TASK-05 | `inventario.service.ts` + `useInventarioStore` | 02, 04 |
| TASK-06 | `pin.service.ts`, `PinModal`, `usePin` | 01, 02 |
| TASK-07 | Supabase client + `sync.service.ts` | 01, 02 |
| TASK-08 | Módulo Gestión (Productos/Recetas/PIN/Config) | Fase 1 completa |
| TASK-09 | Módulo Ventas (pantallas) | 08 |
| TASK-10 | Módulo Pedidos + `pedidos.service.ts` | 09 |
| TASK-11 | Módulo Bodega (pantallas) | 08 |
| TASK-12 | Módulo Gastos (pantallas) | 08–11 |
| TASK-13 | Módulo Resumen + `calculos.ts` | 09–12 |
| TASK-14 | Impresora Bluetooth + `TicketModal` | 09, 13 |

---

## 10. Checklist de verificación (para el agente con acceso al código)

Para cada punto: marcar ✅ existe y coincide / ⚠️ existe pero difiere / ❌ falta.

**Estructura y setup**
- [ ] Todas las carpetas/archivos de la sección 3 existen.
- [ ] `app.json`, `tailwind.config.js`, `babel.config.js`, `metro.config.js` configurados como en TASK-01.
- [ ] Tab bar: confirmar si son 5 o 6 tabs y documentar cuál quedó.

**Base de datos**
- [ ] `src/db/schema.ts` define las 12 tablas con los campos exactos de la sección 4.
- [ ] `runMigrations()` crea las 12 tablas con `CREATE TABLE IF NOT EXISTS` + PRAGMAs WAL/foreign_keys.
- [ ] `configuracion` se inicializa con las 5 claves por defecto.
- [ ] `runSeeds()` no duplica datos en reinicios sucesivos.

**Ventas**
- [ ] `crearVenta` está envuelto en `db.transaction`.
- [ ] Al confirmar una venta se descuenta stock de TODOS los ingredientes de la receta de cada producto vendido.
- [ ] El carrito no persiste tras cerrar y reabrir la app.
- [ ] Caja: abrir/cerrar funciona y calcula diferencia (esperado - contado).

**Pedidos**
- [ ] `entregarPedido` llama a `crearVenta` (no reimplementa la lógica).
- [ ] Cambios de estado pendiente→preparando→entregado reflejan en la UI con colores correctos.

**Inventario**
- [ ] `ajustarStock`, `registrarCompra`, `registrarGasto`, creación de ingredientes: todos exigen PIN **en la pantalla**, no en el service.
- [ ] Alertas de stock bajo aparecen cuando `stock_actual <= stock_minimo`.

**PIN**
- [ ] Primer uso (sin PIN guardado) acepta cualquier PIN de 4 dígitos.
- [ ] El módulo Gestión exige PIN siempre al entrar.
- [ ] El PIN nunca aparece en logs, AsyncStorage plano, ni se ve en pantalla (solo puntos).

**Sync**
- [ ] App arranca y funciona sin `.env` de Supabase configurado.
- [ ] `configuracion` está excluida de `SYNC_TABLES`.
- [ ] Sin internet, `sincronizar()` retorna sin lanzar excepción visible al usuario.

**Resumen**
- [ ] Ganancia estimada = ventas - gastos - costoIngredientes, color rojo si negativa.
- [ ] Datos se recargan al volver al tab (`useFocusEffect`).

**Impresora**
- [ ] Sin impresora configurada, el flujo de venta y el TicketModal funcionan igual.
- [ ] Fallo de impresión no crashea ni bloquea nada.

---

## 11. Guía de testing manual (para el agente de QA, una vez verificada la arquitectura)

> Cada caso indica: pasos, resultado esperado y qué tabla/campo confirmar en SQLite si hay dudas.

### Caso 1 — Arranque limpio
1. Borrar/desinstalar la app (o limpiar storage) y abrir por primera vez.
2. Esperado: spinner naranja breve → tabs visibles → consola muestra "✅ Migrations ejecutadas" y "✅ Seeds ejecutados...".
3. Cerrar y volver a abrir: consola debe mostrar "Seeds ya ejecutados, omitiendo...".

### Caso 2 — Venta directa simple
1. Ir a Ventas, agregar 2 unidades de "Salchipapa" al carrito.
2. Verificar que el total mostrado = 2 × precio.
3. Tocar "Cobrar ahora" → elegir "Efectivo" → "Confirmar venta".
4. Esperado: aparece TicketModal con el resumen correcto; carrito queda vacío al cerrar.
5. Verificar en BD: nueva fila en `ventas` y `venta_items`; `ingredientes.stock_actual` de papas/salchichas/aceite reducido según receta (0.25kg, 0.15kg, 0.05L por unidad vendida).

### Caso 3 — Venta agota inventario por debajo del mínimo
1. Vender productos hasta que algún ingrediente caiga por debajo de su `stock_minimo`.
2. Ir a Resumen: debe aparecer la card "⚠ Inventario bajo" con ese ingrediente.
3. Ir a Bodega → Inventario: debe verse el ícono de alerta ⚠ en rojo en esa fila.

### Caso 4 — Pedido completo hasta entrega
1. Crear un pedido por WhatsApp con 1 "Combo familiar", nombre de cliente, sin nota.
2. Verificar estado "Pendiente" (borde naranja) en la lista.
3. Tocar "Preparando" → confirmar que cambia a borde azul y badge "Preparando".
4. Tocar "Entregar y cobrar" → elegir método de pago → confirmar.
5. Esperado: pedido pasa a "Entregado" (verde, opacidad reducida), se crea una venta vinculada (`ventas.pedido_id` = id del pedido), y el inventario se descuenta igual que en una venta directa.

### Caso 5 — Ajuste de stock con PIN
1. Ir a Bodega → Inventario → tocar un ingrediente.
2. Ingresar stock real distinto al actual + motivo.
3. Tocar "Guardar ajuste" → debe pedir PIN.
4. Probar primero con PIN incorrecto: esperado vibración + puntos rojos + se limpia el campo.
5. Probar con PIN correcto: esperado se aplica el ajuste, se registra movimiento tipo `ajuste` con la diferencia exacta (positiva o negativa).

### Caso 6 — Registrar compra y costo promedio
1. Bodega → Compras → "+ Registrar compra" para "Pollo": cantidad 5kg, costo $20.
2. PIN correcto → verificar que aparece en la lista del día y que el total del día sube $20.
3. Verificar que `stock_actual` de Pollo subió +5kg.
4. (Indirecto) Vender un producto con Pollo y revisar en Resumen que "Ganancia est." considera ese costo (vía `getCostoUnitarioPromedio`).

### Caso 7 — Gastos
1. Gastos → "+ Gasto" → PIN → registrar "Pago luz" $15, categoría Servicios.
2. Verificar que aparece en la lista, badge azul "Servicios", y el total del día sube $15.
3. Filtrar por categoría "Personal": la lista debe quedar vacía si no hay gastos de esa categoría.

### Caso 8 — Caja diaria
1. Ventas → Caja: si no hay caja abierta hoy, abrir con monto inicial $50.
2. Hacer 2-3 ventas en efectivo y 1 en transferencia.
3. Volver a Caja: debe mostrar monto inicial, total efectivo, total transferencia, total esperado.
4. Ingresar "Monto contado" distinto al esperado → la diferencia debe mostrarse en rojo; si coincide, en verde.
5. Cerrar caja (pide PIN) → estado pasa a solo lectura.

### Caso 9 — PIN: primer uso y cambio
1. En una instalación nueva (pin_hash vacío), cualquier PIN de 4 dígitos debe pasar la primera vez que se solicite.
2. Ir a Gestión (pide PIN) → "PIN y Acceso" → cambiar a un PIN específico, ej. 1234.
3. Cerrar sesión de Gestión, volver a entrar: ahora solo 1234 debe funcionar; cualquier otro PIN de 4 dígitos debe fallar.

### Caso 10 — Resumen, cálculo de ganancia
1. Con datos del día (ventas, gastos, compras ya registrados en los casos anteriores), abrir Resumen.
2. Confirmar manualmente: Ganancia mostrada == Ventas hoy − Gastos hoy − Costo ingredientes hoy (calculado con `calcularGanancia`).
3. Si el número es negativo, debe mostrarse en rojo; si es positivo, en verde.

### Caso 11 — Funcionamiento sin Supabase / sin internet
1. Sin configurar `.env` (o con WiFi/datos apagados), repetir Casos 2 y 4.
2. Esperado: todo funciona idéntico, sin errores visibles al usuario; en consola puede verse "Supabase no configurado" o "Sin conexión a internet" pero la app sigue operando.

### Caso 12 — Impresora opcional
1. Sin impresora configurada: completar una venta, verificar que el TicketModal aparece sin botón "Imprimir".
2. Configurar una impresora (Gestión → Configuración → buscar dispositivos) y repetir: el botón "Imprimir" debe aparecer.
3. Simular una impresora desconectada/fuera de rango y tocar "Imprimir": no debe crashear, debe fallar silenciosamente o mostrar aviso simple.

### Caso 13 — Gestión protegida
1. Tocar el tab Gestión: debe pedir PIN inmediatamente, sin mostrar el menú antes.
2. Cancelar el PIN: debe regresar al tab anterior, no quedarse en una pantalla en blanco.
3. Con PIN correcto: deben verse las 4 secciones (Productos, Recetas, PIN y Acceso, Configuración).

---

## 12. Inconsistencias detectadas que el agente debe resolver/confirmar

1. **Tabs: 5 vs 6.** TASK-01 crea carpeta `app/(tabs)/gastos/` como tab independiente y TASK-12 la
   desarrolla como módulo de tab completo, pero DESIGN_SYSTEM.md describe el tab bar con solo 5 tabs
   (sin Gastos). Confirmar en el código real cuántos tabs hay y si esto afecta la navegación esperada.
2. **PIN en compras/gastos/ajustes:** confirmar que el componente `PinModal` se invoca consistentemente
   desde la UI antes de cada operación sensible, y no se "saltea" en alguna pantalla por descuido.
3. **`getPedidosHoy()` en `pedidos.service.ts`** compara `pedidos.createdAt` (string ISO completo) con
   `todayDate()` (solo `YYYY-MM-DD`) usando `eq`, lo cual nunca va a coincidir como en otras consultas
   que usan rango `gte`/`lte`. Confirmar si esto es un bug real en el código (probablemente sí) y si se
   corrigió.
