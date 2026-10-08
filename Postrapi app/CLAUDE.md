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

# Procedimientos repetibles → skill (siempre)

Cuando Paul pida hacer algo complejo o que se va a repetir (subir a GitHub, publicar un build, probar la app sin tocar la nube, crear un negocio de prueba, etc.), no lo resuelvas solo una vez:

1. Hazlo, y cuando Paul confirme que quedó bien, **crea un skill** del proyecto en `.claude/skills/<nombre>/SKILL.md` con los pasos exactos, los comandos y las trampas que aparecieron. Si el procedimiento es automático y sin decisiones (por ejemplo, correr algo en cada sesión), usa un hook en `.claude/settings.json`; si hace falta correr algo fuera de Claude (n8n, GitHub Actions), propón un workflow y explica por qué.
2. Antes de empezar una tarea de este tipo, revisa si ya existe un skill en `.claude/skills/` y úsalo, para no gastar tokens re-descubriendo los pasos.
3. Anota en `seguimiento/TAREAS.md` (sección Hechas) qué skill se creó.
4. Skills ya creados: (ninguno todavía)
