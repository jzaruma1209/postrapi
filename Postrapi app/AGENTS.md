# Postrapi — Expo SDK 57 + React Native 0.86 (win32)

App de punto de venta para restaurantes, pensada para funcionar sin internet: todo se guarda en SQLite en el teléfono y se sube a Supabase cuando hay conexión. Objetivo actual: convertirla en SaaS (ver `seguimiento/TAREAS.md`).

Lee **https://docs.expo.dev/versions/v57.0.0/** antes de escribir código. Ojo: varias dependencias siguen en versiones de SDK 54 (tarea T-07); revisa con `npx expo install --check`.

## Stack

- **Navegación:** expo-router (`app/`), pestañas en `app/(tabs)/`.
- **Datos locales:** expo-sqlite + drizzle-orm. Esquema en `src/db/schema.ts`; las migraciones que se ejecutan están escritas a mano en `src/db/migrations/index.ts` (los `.sql` de drizzle no se usan).
- **Nube:** Supabase (`src/supabase/client.ts`), sync de solo subida cada 60 s (`src/services/sync.service.ts`).
- **Estado:** zustand (`src/stores/`). **Estilos:** NativeWind + `DESIGN_SYSTEM.md`.
- TypeScript estricto. No hay tests, lint ni CI.

## Estructura

| Ruta | Qué hay |
|---|---|
| `app/(tabs)/index.tsx` | Resumen del día |
| `app/(tabs)/ventas/` | Venta, caja, historial de ventas y de cajas, detalle |
| `app/(tabs)/pedidos/` | Pedidos (pendiente → preparando → entregado) |
| `app/(tabs)/bodega/`, `gastos/` | Inventario y compras; gastos |
| `app/(tabs)/gestion/` | Productos, recetas, PIN, anulación, respaldo, configuración (protegido con PIN) |
| `src/services/` | Lógica de negocio (ventas, pedidos, inventario, anulación, pin, sync) |
| `seguimiento/` | Tareas, mejoras, sesiones y diagramas de flujo |

## Comandos

| Acción | Comando |
|---|---|
| Desarrollo | `npm start` |
| Web | `npm run web` |
| Android | `npm run android` |
| Typecheck | `npx tsc --noEmit` |

## Reglas y trampas conocidas

- **Toda actualización de una fila debe poner `synced: 0`**; si no, el cambio nunca sube a Supabase (tarea T-02).
- **Fechas:** hoy se usa la fecha UTC (`todayDate()` en `src/utils/dates.ts`), que en Ecuador cambia de día a las 19:00 (tarea T-01). No agregues más usos de `toISOString().split("T")[0]` para "hoy".
- **Pruebas locales sin tocar la nube:** arranca con `EXPO_PUBLIC_SUPABASE_URL= EXPO_PUBLIC_SUPABASE_ANON_KEY= EXPO_NO_DOTENV=1 npx expo start`. Con Supabase activo, los datos de ejemplo (IDs fijos) se suben y pisan los de la nube.
- **Web:** `src/db/index.web.ts` usa la API async de expo-sqlite porque la síncrona falla en web. `metro.config.js` agrega los encabezados COOP/COEP. `Alert.alert` no hace nada en web, así que las confirmaciones (anular, cerrar caja, etc.) solo se pueden probar en Android.
- **PIN** por defecto `0000`; la mayoría de acciones de Gestión, gastos y ajustes de stock lo piden.
- Las carpetas nativas (`/ios`, `/android`) están en `.gitignore`; se regeneran con `npx expo prebuild`. El APK se construye con EAS (`eas.json`).
