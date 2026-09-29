# Resumen de Sesión — 5-6 de Julio 2026

## Testing manual — 13 casos: ✅ COMPLETO

| Caso | Estado |
|---|---|
| 1 — Arranque limpio | ✅ Pasa |
| 2 — Venta directa simple | ✅ Pasa |
| 3 — Venta agota inventario | ✅ Pasa |
| 4 — Pedido completo hasta entrega | ✅ Pasa |
| 5 — Ajuste de stock con PIN | ✅ Pasa |
| 6 — Compra y costo promedio | ✅ Pasa |
| 7 — Gastos | ✅ Pasa |
| 8 — Caja diaria | ✅ Pasa (cerrado en sesión anterior) |
| 9 — PIN primer uso y cambio | ✅ Pasa |
| 10 — Resumen y ganancia | ✅ Pasa |
| 11 — Funcionamiento sin internet | ✅ Pasa |
| 12 — Impresora opcional | ⚪ Omitido (sin hardware para probar) |
| 13 — Gestión protegida | ✅ Pasa |

**La guía de testing manual de Postrapi queda formalmente cerrada.** 12 de 13 casos aplicables, todos pasando; el 12 queda marcado aparte por falta de impresora física, no como pendiente real.

---

## Features nuevas implementadas

### 1. Filtro de categorías en Ventas
- Chips "Todos / Combos / Bebidas / Porciones" en el módulo de Ventas.
- Columna `categoria` agregada a la tabla `productos` (local y Supabase), con selector de categoría en el formulario de Gestión → Productos.
- Migración local 0003 aplicada; `ALTER TABLE` manual corrido en Supabase (el agente solo había agregado la columna en local, no en remoto — corregido).

### 2. Número de venta visible en el Ticket
- Antes el número de venta (#1, #2...) solo aparecía en Historial y Detalle de Venta.
- Ahora también aparece en: el ticket que se muestra al cobrar, el ticket abierto desde "Ver Ticket" en Detalle de Venta, y la impresión Bluetooth.
- Cambios en `TicketModal.tsx` (componente compartido), `ventas/[id].tsx`, `ventas/index.tsx`, `pedidos/index.tsx`, `printer.service.ts` y su stub web.

### 3. Botón "Cancelar" en Ventas
- Vacía el carrito completo de una sola vez (antes había que restar producto por producto).
- Muestra confirmación (Alert "Cancelar" / "Sí, vaciar") antes de vaciar, para evitar borrados accidentales.
- Reusa la misma función de limpieza de carrito que ya usaba el flujo de cobro.

### 4. Reset de filtro y scroll en Ventas
- Al salir del tab Ventas y volver, el filtro de categoría vuelve a "Todos" y el scroll del grid de productos vuelve arriba.
- Implementado con `useFocusEffect` + `useRef`, sin tocar el carrito de Zustand (el carrito en curso se mantiene intacto).

### 5. Pantalla "Respaldo" en Gestión
- Nueva entrada en el menú de Gestión que muestra el estado de sincronización con Supabase: fecha/hora del último intento, estado por tabla (✅/❌ con mensaje de error), y cantidad de registros pendientes (`synced = 0`) por tabla.
- Botón "Sincronizar ahora" para forzar un intento manual.
- Requirió nueva tabla local `sync_log` (migración 0004, solo local, nunca se sincroniza a Supabase) y dos funciones nuevas en `sync.service.ts`: `contarPendientes()` y `obtenerUltimosSyncLogs()`.
- Protección por PIN heredada automáticamente del layout de Gestión.

### 6. Sistema de recuperación de PIN
- Si el usuario falla el PIN 4 veces seguidas, aparece el link "¿Olvidaste tu PIN?".
- Al tocarlo, se muestra la fecha de hoy y un campo para ingresar un código de 6 dígitos.
- El código correcto se calcula con una fórmula determinística basada en la fecha actual + un `SALT_SECRETO` que solo Paul conoce (`src/utils/pinRecovery.ts`), lo que hace que el código cambie todos los días.
- Si el código coincide, permite setear un PIN nuevo (reusando la lógica ya existente de "cambiar PIN").
- **Pendiente:** Paul debe reemplazar el `SALT_SECRETO` de ejemplo por su valor final antes de producción, y guardarlo en un lugar propio fuera del proyecto.

---

## Bugs corregidos

### 1. Coma decimal no funcionaba en inputs numéricos
- `Number("15,75")` devuelve `NaN` en JavaScript porque el teclado numérico en español usa coma como separador decimal.
- Afectaba: `gestion/productos.tsx`, `ventas/index.tsx` (descuento), `pedidos/index.tsx` (descuento), `gestion/recetas.tsx` (cantidad), `gestion/configuracion.tsx` (stock mínimo).
- Fix: helper común `parseNumber()` en `src/utils/numbers.ts` que reemplaza coma por punto antes de convertir. Aplicado en los 5 archivos, sin tocar los que ya normalizaban bien (`bodega/index.tsx`, `ventas/caja.tsx`, `gastos/index.tsx`).

### 2. Columna `categoria` faltante en Supabase
- El agente había agregado la columna solo en local (schema + migración), no en la tabla remota.
- Corregido con `ALTER TABLE public.productos ADD COLUMN categoria text NOT NULL DEFAULT 'combo';` corrido manualmente en Supabase.

### 3. Layout roto en Nuevo Pedido (3 rondas de fixes)
- Ronda 1: footer sin efecto blur (se veía sólido/opaco) — causa: `BlurView` sin `position: absolute`, sentado sobre un fondo opaco del contenedor padre.
- Ronda 2: footer flotante pero pegado al borde físico de la pantalla (`bottom: 24` fijo, sin sumar el área segura del dispositivo) — corregido con `useSafeAreaInsets()`.
- Ronda 3: modal colapsado a 0px de alto por un `flex: 1` mal puesto en el `ScrollView` sin que el padre tuviera altura fija — corregido quitando el `flex: 1` y dejando que el `ScrollView` crezca naturalmente hasta el `maxHeight: '90%'` del contenedor padre.

### 4. Bug de sync: FK violation en `venta_items`
- Error real encontrado gracias a la nueva pantalla de Respaldo: `insert or update on table "venta_items" violates foreign key constraint`.
- Causa raíz: `anularVenta()` y `anularPedido()` marcaban la anulación (`anulada: 1`, `anuladoAt`, etc.) pero **no reseteaban `synced: 0`** — la anulación de una venta/pedido ya sincronizado nunca se subía a Supabase.
- Diagnóstico confirmó que este bug probablemente venía ocurriendo en silencio desde antes de la sesión de hoy, ya que antes de la tabla `sync_log` los errores solo se veían en `console.error` (invisible fuera de un debugger conectado).
- Fix aplicado en 3 puntos: `ventas.service.ts:201`, `pedidos.service.ts:170` y `pedidos.service.ts:184` — se agregó `synced: 0` a cada `.set({...})` de anulación.

---

## Pendiente para la próxima sesión

1. **Confirmar el fix del chip de fecha duplicado en Resumen** (tab "Otros") — en investigación con un agente premium con contexto completo de 2 intentos fallidos previos.
2. **Aplicar 3 fixes combinados, ya diagnosticados:**
   - Error al mapear fecha nula en `respaldo.tsx`.
   - "Pendientes" en Resumen contaba pedidos anulados (debe excluirlos).
   - Footer de Bodega ("Total compras hoy") tapado por el tab bar — aplicar el mismo patrón de footer flotante con blur y safe area ya usado en Ventas y Pedidos.
3. **Revisar en la pantalla Respaldo** el mensaje de error específico de la tabla `ventas` para confirmar si el bug de sync quedó resuelto de raíz con el fix de `synced: 0`, o si hace falta algo más (ej. validación de datos antes de subir).
4. **Revisar errores preexistentes** mencionados en `anulacion.tsx`, `pedidos/index.tsx`, `ventas/index.tsx`, `gastos/index.tsx` (reportados por el agente como "no relacionados" a sus cambios, pero sin confirmar qué son exactamente).
5. **Cambiar el `SALT_SECRETO`** de recuperación de PIN por el valor final antes de producción.
