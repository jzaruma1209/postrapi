@AGENTS.md

# Seguimiento del proyecto (siempre)

Las tareas, mejoras y sesiones se guardan en `seguimiento/` (ver `seguimiento/README.md`). Responde a Paul en español.

- **Al iniciar cada sesión:** el hook `.claude/hooks/inicio-sesion.js` inyecta la última sesión y `seguimiento/TAREAS.md`. En tu primera respuesta, empieza con un resumen breve: qué se hizo en la última sesión, el último paso, tareas pendientes (primero las de prioridad alta), mejoras pendientes y lo cumplido recientemente. Si el hook no corrió, lee esos archivos tú mismo antes de responder.
- **"agrega tarea: …"** → añádela en Pendientes de `seguimiento/TAREAS.md` con el siguiente número T-xx, en la prioridad que corresponda (pregunta solo si no se puede deducir).
- **"agrega mejora: …"** → añádela en Mejoras con el siguiente número M-xx.
- **Al terminar una tarea**, o cuando Paul diga "marca T-xx como hecha" → quítala de Pendientes y agrégala en Hechas con la fecha (`AAAA-MM-DD`, hora de Ecuador) y una línea sobre qué se cambió.
- **"cerramos sesión"** → crea `seguimiento/sesiones/AAAA-MM-DD.md` (si ya hay una sesión ese día, usa `AAAA-MM-DD_2.md`, `_3`…) con la plantilla de abajo, actualiza `TAREAS.md` (incluida la fecha de "Última actualización") y responde con un resumen corto. La sección "Último paso" debe ir primero: el hook la muestra al abrir la próxima sesión.

```markdown
# Sesión AAAA-MM-DD

## Último paso
- (lo último que se hizo, en una línea)

## Qué se hizo
- ...

## Decisiones tomadas
- ...

## Archivos cambiados
- `ruta` — qué cambió (indicar si quedó sin commit)

## Pendiente para la próxima sesión
- ...
```
