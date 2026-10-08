# Tareas y mejoras — Postrapi

> Última actualización: 2026-10-07 (noche)
> Prioridad: 🔴 Alta · 🟠 Media · 🟢 Baja · ❓ Requiere decisión de Paul

## Pendientes

### 🔴 Alta
- **T-05** Supabase está abierto: las 11 tablas tienen una política `allow_all` y la clave pública va dentro del APK, así que cualquiera puede leer, modificar o borrar datos. No se puede cerrar hoy sin dejar de sincronizar: el cierre real exige cuentas por negocio (M-01) y reglas RLS por `negocio_id`. Se resuelve junto con M-01.

### 🟠 Media
- **T-06** Los datos de ejemplo (seeds) usan IDs fijos (`prod-*`, `ing-*`). Cada instalación nueva reescribe esos productos e ingredientes en Supabase y suma 15 recetas duplicadas; por eso hay 255 recetas en la nube.
- **T-07** Alinear dependencias con Expo SDK 57 (`npx expo install --fix`): hay 20 paquetes desalineados. Después, probar un build de Android.
- **T-08** "Ganancia est." resta el costo de ingredientes de ventas anuladas: solo cuenta los movimientos `descuento_venta` e ignora las devoluciones.
- **T-09** El botón "Guardar cambios" de Configuración queda tapado por la barra de pestañas. Antes se reportó lo mismo en Bodega; revisar ambas pantallas en el teléfono.

### 🟢 Baja
- **T-10** Historial de Cajas muestra "Caja no aperturada este día" cuando hay una caja abierta, porque solo lista las cerradas.
- **T-11** Si las migraciones fallan al abrir la app, se queda cargando para siempre (`app/_layout.tsx` no tiene try/catch).
- **T-12** TypeScript marca 7 errores en `app/(tabs)/_layout.tsx`: `StyleSheet.absoluteFillObject` ya no existe en RN 0.86 y el fondo de la barra de pestañas puede verse mal.
- **T-13** Cambiar `SALT_SECRETO` en `src/utils/pinRecovery.ts` y sacarlo del código (hoy está en git).
- **T-14** Limpiar archivos sueltos: `npm` y `npx` (vacíos), `find_private_fields.js`, `App.tsx` e `index.ts` (sin uso), `ESTADO-AGENTES.json` y `tarea para ejecutar.md`.
- **T-15** La impresión Bluetooth está desactivada desde la v1.

### ❓ Decisión
- **T-16** Limpiar en Supabase las 30 recetas duplicadas que subieron las pruebas del 2026-10-07 (`created_at` 2026-10-08T03:47 y 03:49 UTC, `producto_id` `prod-*`). Paul lo aprobó pero el permiso de borrado fue rechazado; falta repetirlo. Además hay unos 210 duplicados más de instalaciones anteriores (ver T-17).
- **T-17** En Supabase hay 255 recetas pero solo 15 combinaciones únicas (producto + ingrediente): unos 240 duplicados desde julio por T-06. Decidir si se borran todos los repetidos dejando el más antiguo de cada combinación.

## Mejoras (ideas)

### Camino a SaaS
- **M-01** Varias cuentas: login con Supabase Auth, `negocio_id` en todas las tablas y seguridad RLS por negocio.
- **M-02** Sincronización en ambos sentidos (PowerSync o propia). Hace falta para usar varios dispositivos y para recuperar los datos en un teléfono nuevo.
- **M-03** Usuarios y roles (dueño, cajero, mesero, cocina), cada uno con su PIN.
- **M-04** Mesas, cuentas abiertas, notas por plato ("sin cebolla") y dividir la cuenta.
- **M-05** Pantalla de cocina en tiempo real y comanda impresa (sirve durante los apagones).
- **M-06** Al registrarse: menú vacío y categorías propias, sin productos de ejemplo.
- **M-07** Panel web Pro: reportes avanzados, rentabilidad por plato y exportar a Excel.
- **M-08** IA en Pro: preguntas en lenguaje natural, alertas de caja descuadrada y de stock, sugerencias de compra.
- **M-09** Pedidos automáticos por WhatsApp (n8n) con menú digital.
- **M-10** Facturación electrónica del SRI a través de un proveedor externo.
- **M-11** Publicar en Play Store: política de privacidad, opción de borrar cuenta y prueba cerrada (12 testers durante 14 días).

### Plataforma y forma de trabajo
- **M-17** Decidir el backend para el SaaS. Supabase sirve (un solo proyecto para todos los negocios, separados por `negocio_id` y RLS), pero hay que pasar al plan Pro (de pago) antes de tener clientes: el plan gratis pausa el proyecto tras una semana sin uso y tiene límites de almacenamiento. Comparar costos con alternativas (PowerSync + Postgres propio, Firebase) antes de decidir.
- **M-18** Trabajar con Issues y Pull Requests de GitHub (repositorio `jzaruma1209/postrapi`): una rama por tarea, revisión antes de unir a `main`. Cubre lo que Jira haría, sin costo.
- **M-19** Convertir en workflow/skill los procedimientos complejos que se repiten (regla en `CLAUDE.md`), para no gastar tokens re-explicando.

### Producto actual
- **M-12** Diálogos que funcionen en todas las plataformas: `Alert.alert` no hace nada en web (47 usos) y por eso anular, cerrar caja o vaciar el carrito no funcionan en el navegador.
- **M-13** Gastos con método de pago (hoy la caja asume que todos se pagan en efectivo).
- **M-14** PIN más seguro: hash con sal y bloqueo por intentos (hoy es SHA-256 sin sal de 4 dígitos, se descifra en milisegundos).
- **M-15** Centralizar colores y tipografías en un solo archivo de tema (pregunta pendiente del archivo de notas de julio).
- **M-16** Ganancia más útil: hoy depende de que se registren compras con precio; sin compras, la ganancia es igual a las ventas.

## Hechas
- **2026-10-07** T-01 La fecha de "hoy" ahora es la hora local del teléfono, no UTC (`src/utils/dates.ts`: `todayDate`, `fechaLocal`, `inicioDia`, `finDia`; reemplazados los 51 usos). Verificado en web: la caja abre con fecha 2026-10-07 a las 11 p. m. Las cajas viejas guardadas con fecha UTC quedan como estaban.
- **2026-10-07** T-02 Toda actualización de cierre de caja, estado/entrega de pedidos y stock de ingredientes ahora marca `synced: 0` y sube a Supabase.
- **2026-10-07** T-03 Ventas, pedidos, anulaciones, ajustes de stock y compras corren dentro de una transacción real que se deshace si algo falla (`src/db/transaccion.ts`). Verificado en web con una venta: el stock se descontó bien. Falta probar en Android.
- **2026-10-07** T-04 Aplicar descuento pide el PIN de supervisor en Ventas y en Pedidos. Verificado en web.
- **2026-10-07** La app web ya no se cae con "SharedArrayBuffer is not defined": `metro.config.js` ahora envía los encabezados COOP/COEP al HTML y acepta `.wasm`.
- **2026-10-07** En web la base usa la API async de expo-sqlite (`src/db/index.web.ts`). Evita el timeout y el JSON truncado de la API síncrona (fallas de la propia librería).
- **2026-10-07** La app ya no se cae si faltan las variables de Supabase (`src/supabase/client.ts` y `client.web.ts`).
- **2026-10-07** Revisión completa de pantallas en web; hallazgos registrados arriba.
- **2026-10-07** Verificado que ya estaban resueltos: "Pendientes" de Resumen excluye pedidos anulados y Respaldo carga sin el error de fecha nula.
- **2026-10-07** Creados esta carpeta de seguimiento, el diagrama de flujo (`FLUJO.md`) y el resumen automático al iniciar sesión.
