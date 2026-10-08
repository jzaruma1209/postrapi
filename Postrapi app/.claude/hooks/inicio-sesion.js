// Hook SessionStart: al abrir una sesión de Claude en este proyecto, muestra un
// resumen corto al usuario y le pasa a Claude la última sesión y el estado de
// las tareas (seguimiento/). Ver seguimiento/README.md.
const fs = require("fs");
const path = require("path");

const raiz = path.resolve(__dirname, "..", "..");
const carpeta = path.join(raiz, "seguimiento");
const MAX_SESION = 8000;

function leer(ruta) {
  try {
    return fs.readFileSync(ruta, "utf8");
  } catch {
    return null;
  }
}

function ultimaSesion() {
  const dir = path.join(carpeta, "sesiones");
  let archivos = [];
  try {
    archivos = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}.*\.md$/.test(f));
  } catch {
    return null;
  }
  if (archivos.length === 0) return null;
  // Sin la extensión, "2026-10-07" queda antes que "2026-10-07_2"
  const clave = (f) => f.replace(/\.md$/, "");
  archivos.sort((a, b) => (clave(a) < clave(b) ? -1 : clave(a) > clave(b) ? 1 : 0));
  const nombre = archivos[archivos.length - 1];
  return { nombre, texto: leer(path.join(dir, nombre)) ?? "" };
}

function seccion(texto, titulo) {
  const inicio = texto.indexOf(`## ${titulo}`);
  if (inicio === -1) return "";
  const resto = texto.slice(inicio + titulo.length + 3);
  const fin = resto.search(/\n## /);
  return fin === -1 ? resto : resto.slice(0, fin);
}

function contar(texto, regex) {
  return (texto.match(regex) || []).length;
}

const tareas = leer(path.join(carpeta, "TAREAS.md")) ?? "";
const pendientes = seccion(tareas, "Pendientes");
const alta = seccion(pendientes.replace(/### /g, "## "), "🔴 Alta");
const nPendientes = contar(pendientes, /^- \*\*T-\d+/gm);
const nAlta = contar(alta, /^- \*\*T-\d+/gm);
const nMejoras = contar(seccion(tareas, "Mejoras (ideas)"), /^- \*\*M-\d+/gm);
const nHechas = contar(seccion(tareas, "Hechas"), /^- \*\*\d{4}-/gm);

const sesion = ultimaSesion();
let ultimoPaso = "";
if (sesion) {
  const bloque = seccion(sesion.texto, "Último paso").trim();
  ultimoPaso = bloque.split("\n").find((l) => l.trim()) ?? "";
  ultimoPaso = ultimoPaso.replace(/^[-*]\s*/, "").slice(0, 160);
}

const lineas = [
  "📋 Postrapi — seguimiento",
  sesion
    ? `Última sesión: ${sesion.nombre.replace(/\.md$/, "")}${ultimoPaso ? ` · Último paso: ${ultimoPaso}` : ""}`
    : "Aún no hay sesiones guardadas (di \"cerramos sesión\" al terminar).",
  `Pendientes: ${nPendientes} (${nAlta} de prioridad alta) · Mejoras: ${nMejoras} · Hechas: ${nHechas}`,
];

const contexto = [
  "Estado del seguimiento del proyecto (generado por .claude/hooks/inicio-sesion.js).",
  "En tu primera respuesta de esta sesión, empieza con un resumen breve en español: qué se hizo en la última sesión, el último paso, tareas pendientes (prioriza las de alta), mejoras pendientes y tareas cumplidas recientemente.",
  "",
  sesion
    ? `### Última sesión (seguimiento/sesiones/${sesion.nombre})\n${sesion.texto.slice(0, MAX_SESION)}`
    : "### Última sesión\nNo hay sesiones guardadas todavía.",
  "",
  `### seguimiento/TAREAS.md\n${tareas || "(no existe)"}`,
].join("\n");

process.stdout.write(
  JSON.stringify({
    systemMessage: lineas.join("\n"),
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: contexto,
    },
  })
);
