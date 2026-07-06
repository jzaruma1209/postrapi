// SECRETO: cambiar este valor por uno propio antes de publicar, y no compartirlo.
const SALT_SECRETO = 734891; // Paul: reemplazá este número por el tuyo antes de usar en producción

export function generarCodigoRecuperacion(fecha: Date): string {
  const dia = fecha.getDate();
  const mes = fecha.getMonth() + 1;
  const anio = fecha.getFullYear();
  const base = (dia * 31 + mes * 97 + anio * 7 + SALT_SECRETO) % 900000;
  const codigo = (base + 100000).toString(); // asegura 6 dígitos siempre
  return codigo;
}
