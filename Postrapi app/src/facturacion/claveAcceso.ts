// Clave de acceso de 49 dígitos del SRI:
// fecha ddmmaaaa (8) + tipo de comprobante (2) + RUC (13) + ambiente (1)
// + establecimiento (3) + punto de emisión (3) + secuencial (9)
// + código numérico (8) + tipo de emisión (1) + dígito verificador módulo 11 (1).

export function modulo11(digitos: string): number {
  let factor = 2;
  let suma = 0;
  for (let i = digitos.length - 1; i >= 0; i--) {
    suma += Number(digitos[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const verificador = 11 - (suma % 11);
  if (verificador === 11) return 0;
  if (verificador === 10) return 1;
  return verificador;
}

export function formatearSecuencial(numero: number): string {
  if (!Number.isInteger(numero) || numero < 1 || numero > 999999999) {
    throw new Error(`Secuencial fuera de rango: ${numero}`);
  }
  return String(numero).padStart(9, "0");
}

export function codigoNumericoAleatorio(): string {
  return String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
}

export function generarClaveAcceso(p: {
  fechaEmision: string; // dd/mm/aaaa
  tipoComprobante: string;
  ruc: string;
  ambiente: string;
  estab: string;
  ptoEmi: string;
  secuencial: string;
  codigoNumerico: string;
  tipoEmision: string;
}): string {
  const fecha = p.fechaEmision.replace(/\//g, "");
  const base =
    fecha + p.tipoComprobante + p.ruc + p.ambiente + p.estab + p.ptoEmi +
    p.secuencial + p.codigoNumerico + p.tipoEmision;
  if (!/^\d{48}$/.test(base)) {
    throw new Error(`Datos inválidos para la clave de acceso (${base.length} de 48 dígitos): ${base}`);
  }
  return base + modulo11(base);
}
