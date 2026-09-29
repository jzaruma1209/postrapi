# Reporte de Sesión — 25 de Junio 2026

## Resumen
Se identificaron y corrigieron múltiples errores en el proyecto React Native / Expo con Drizzle ORM y Supabase. Todos los errores tenían la misma raíz: uso de nombres camelCase donde el schema de Drizzle define `created_at` en snake_case.

---

## Errores corregidos

### ✅ Error 1 — Historial de Ventas
**Archivo:** `app/(tabs)/ventas/historial.tsx`  
**Error:** `TypeError: Cannot convert undefined value to object`  
**Causa:** La query usaba `ventas.createdAt` pero en el schema está definido como `created_at`.  
**Correcciones:**
- Tipo `VentaHistorial`: `createdAt` → `created_at`
- Query: `gte(ventas.createdAt, ...)` → `gte(ventas.created_at, ...)`
- Query: `lte(ventas.createdAt, ...)` → `lte(ventas.created_at, ...)`
- Query: `orderBy(desc(ventas.createdAt))` → `orderBy(desc(ventas.created_at))`
- JSX: `v.createdAt` → `v.created_at`

---

### ✅ Error 2, 3, 4 — Sync con Supabase (productos, ingredientes, recetas)
**Archivo:** `src/services/sync.service.ts`  
**Error:** `TypeError: Network request failed` → luego `Could not find the 'imagenUrl' column in schema cache`  
**Causa:** Drizzle devuelve los datos en camelCase pero Supabase espera snake_case en los nombres de columna.  
**Corrección:** Se agregó función helper `toSnakeCase()` que convierte todas las keys antes del `.upsert()`:
```ts
function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k.replace(/([A-Z])/g, '_$1').toLowerCase(),
      v
    ])
  );
}
```
Y se usa así antes del upsert:
```ts
const pendientesSnake = pendientes.map(toSnakeCase);
const { error } = await supabase.from(name).upsert(pendientesSnake, { onConflict: "id" });
```

---

### ✅ Error 5 — Gestión de Productos
**Archivo:** `app/(tabs)/gestion/productos.tsx`  
**Error:** `no such column: desc`  
**Causa:** Mismo problema `createdAt` vs `created_at`.  
**Correcciones:**
- Query: `orderBy(desc(productos.createdAt))` → `orderBy(desc(productos.created_at))`
- Insert: `createdAt: new Date().toISOString()` → `created_at: new Date().toISOString()`

---

### ✅ Error 6 — Gestión de Recetas
**Archivo:** `app/(tabs)/gestion/recetas.tsx`  
**Error:** `TypeError: Cannot convert undefined value to object`  
**Causa:** Mismo problema `createdAt` vs `created_at`.  
**Correcciones:**
- Select: `createdAt: recetas.createdAt` → `created_at: recetas.created_at`
- Insert: `createdAt: new Date().toISOString()` → `created_at: new Date().toISOString()`

---

### ✅ Error 7 — Fechas en JSX (ventas, pedidos, gastos)
**Archivos:**
- `app/(tabs)/ventas/[id].tsx`
- `app/(tabs)/pedidos/index.tsx`
- `app/(tabs)/gastos/index.tsx`

**Causa:** El JSX accedía a `.createdAt` en objetos devueltos por Drizzle, pero la propiedad real es `.created_at`.  
**Correcciones:**
- `detalle.venta.createdAt` → `detalle.venta.created_at` (2 líneas)
- `ped.createdAt` → `ped.created_at`
- `gasto.createdAt` → `gasto.created_at`

---

## Regla general para el proyecto

> En el schema de Drizzle (`src/db/schema.ts`), la columna de fecha está definida como `created_at` (snake_case), no como `createdAt` (camelCase). Siempre usar `created_at` en queries, inserts, updates y JSX.

Los demás nombres camelCase del schema (como `productoId`, `stockActual`, `metodoPago`, etc.) están correctamente mapeados por Drizzle y **no** necesitan cambiarse.

---

## Estado final
Todos los errores identificados fueron corregidos. La app carga sin errores en historial, productos, recetas, ventas, pedidos y gastos.
