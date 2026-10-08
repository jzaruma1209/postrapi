// Validación de cédula y RUC ecuatorianos.

export function validarCedula(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (Number(cedula[2]) >= 6) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let valor = Number(cedula[i]) * coeficientes[i];
    if (valor > 9) valor -= 9;
    suma += valor;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

// Para RUC de personas naturales se valida la cédula. Para sociedades (tercer
// dígito 6 o 9) solo se valida el formato: los RUC nuevos de sociedades ya no
// garantizan el dígito verificador clásico.
export function validarRuc(ruc: string): boolean {
  if (!/^\d{13}$/.test(ruc)) return false;
  if (ruc.slice(10) === "000") return false;
  const tercerDigito = Number(ruc[2]);
  if (tercerDigito < 6) return validarCedula(ruc.slice(0, 10));
  return tercerDigito === 6 || tercerDigito === 9;
}

// "04" RUC, "05" cédula, "06" pasaporte, "07" consumidor final.
export function tipoIdentificacionDe(identificacion: string): "04" | "05" | "06" | "07" {
  if (identificacion === "9999999999999") return "07";
  if (/^\d{13}$/.test(identificacion)) return "04";
  if (/^\d{10}$/.test(identificacion)) return "05";
  return "06";
}
