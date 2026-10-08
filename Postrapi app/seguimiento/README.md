# Seguimiento del proyecto

Esta carpeta guarda el estado del trabajo para que cada sesión con Claude arranque sabiendo qué se hizo y qué falta.

| Archivo | Qué contiene |
|---|---|
| `TAREAS.md` | Tareas pendientes (T-xx), mejoras (M-xx) y tareas hechas con fecha |
| `FLUJO.md` | Diagramas de cómo funciona la app hoy |
| `sesiones/AAAA-MM-DD.md` | Registro de cada sesión de trabajo |

## Cómo usarlo (frases para decirle a Claude)

- **"agrega tarea: …"** → se agrega a Pendientes con el siguiente número T-xx.
- **"agrega mejora: …"** → se agrega a Mejoras con el siguiente número M-xx.
- **"marca T-03 como hecha"** → pasa a Hechas con la fecha del día.
- **"cerramos sesión"** → Claude escribe `sesiones/AAAA-MM-DD.md` con lo trabajado, lo último que se hizo y lo que sigue, y actualiza `TAREAS.md`.

Al abrir una sesión nueva, se muestra un resumen de la última sesión y del estado de las tareas. Lo genera `.claude/hooks/inicio-sesion.js`.

Los reportes de sesiones anteriores (junio y julio de 2026) están en la carpeta de arriba (`../reporte_sesion_*.md`).
