import type { DatosFactura } from "./tipos";

// Arma el XML de la factura (sin firmar). La firma XAdES-BES se agrega en el
// servidor antes de enviarla al SRI. Pendiente: validar contra el XSD oficial
// de la versión vigente de la ficha técnica (tarea F-05).

const VERSION = "1.1.0";

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .trim();
}

const d2 = (n: number) => n.toFixed(2);
const d6 = (n: number) => n.toFixed(6);

function etiqueta(nombre: string, valor: string | undefined): string {
  return valor === undefined || valor === "" ? "" : `<${nombre}>${escapar(valor)}</${nombre}>`;
}

export function construirXmlFactura(f: DatosFactura): string {
  const { emisor: e, comprador: c, totales: t } = f;

  const infoTributaria =
    "<infoTributaria>" +
    etiqueta("ambiente", e.ambiente) +
    etiqueta("tipoEmision", "1") +
    etiqueta("razonSocial", e.razonSocial) +
    etiqueta("nombreComercial", e.nombreComercial) +
    etiqueta("ruc", e.ruc) +
    etiqueta("claveAcceso", f.claveAcceso) +
    etiqueta("codDoc", "01") +
    etiqueta("estab", e.estab) +
    etiqueta("ptoEmi", e.ptoEmi) +
    etiqueta("secuencial", f.secuencial) +
    etiqueta("dirMatriz", e.dirMatriz) +
    etiqueta("contribuyenteRimpe", e.contribuyenteRimpe) +
    "</infoTributaria>";

  const totalConImpuestos =
    "<totalConImpuestos>" +
    t.impuestos
      .map(
        (i) =>
          "<totalImpuesto>" +
          `<codigo>2</codigo><codigoPorcentaje>${i.codigoPorcentaje}</codigoPorcentaje>` +
          `<baseImponible>${d2(i.baseImponible)}</baseImponible><valor>${d2(i.valor)}</valor>` +
          "</totalImpuesto>"
      )
      .join("") +
    "</totalConImpuestos>";

  const pagos =
    "<pagos>" +
    f.pagos.map((p) => `<pago><formaPago>${p.formaPago}</formaPago><total>${d2(p.total)}</total></pago>`).join("") +
    "</pagos>";

  const infoFactura =
    "<infoFactura>" +
    etiqueta("fechaEmision", f.fechaEmision) +
    etiqueta("dirEstablecimiento", e.dirEstablecimiento) +
    etiqueta("obligadoContabilidad", e.obligadoContabilidad ? "SI" : "NO") +
    etiqueta("tipoIdentificacionComprador", c.tipoIdentificacion) +
    etiqueta("razonSocialComprador", c.razonSocial) +
    etiqueta("identificacionComprador", c.identificacion) +
    etiqueta("direccionComprador", c.direccion) +
    `<totalSinImpuestos>${d2(t.totalSinImpuestos)}</totalSinImpuestos>` +
    `<totalDescuento>${d2(t.totalDescuento)}</totalDescuento>` +
    totalConImpuestos +
    `<propina>${d2(t.propina)}</propina>` +
    `<importeTotal>${d2(t.importeTotal)}</importeTotal>` +
    "<moneda>DOLAR</moneda>" +
    pagos +
    "</infoFactura>";

  const detalles =
    "<detalles>" +
    f.lineas
      .map(
        (l) =>
          "<detalle>" +
          etiqueta("codigoPrincipal", l.codigoPrincipal.slice(0, 25)) +
          etiqueta("descripcion", l.descripcion.slice(0, 300)) +
          `<cantidad>${d6(l.cantidad)}</cantidad>` +
          `<precioUnitario>${d6(l.precioUnitario)}</precioUnitario>` +
          `<descuento>${d2(l.descuento)}</descuento>` +
          `<precioTotalSinImpuesto>${d2(l.precioTotalSinImpuesto)}</precioTotalSinImpuesto>` +
          "<impuestos><impuesto>" +
          `<codigo>2</codigo><codigoPorcentaje>${l.codigoPorcentajeIva}</codigoPorcentaje>` +
          `<tarifa>${d2(l.tarifaIva)}</tarifa>` +
          `<baseImponible>${d2(l.precioTotalSinImpuesto)}</baseImponible><valor>${d2(l.valorIva)}</valor>` +
          "</impuesto></impuestos>" +
          "</detalle>"
      )
      .join("") +
    "</detalles>";

  const adicionales = Object.entries(f.infoAdicional ?? {}).filter(([, v]) => v);
  const infoAdicional = adicionales.length
    ? "<infoAdicional>" +
      adicionales.map(([k, v]) => `<campoAdicional nombre="${escapar(k)}">${escapar(v)}</campoAdicional>`).join("") +
      "</infoAdicional>"
    : "";

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<factura id="comprobante" version="${VERSION}">` +
    infoTributaria +
    infoFactura +
    detalles +
    infoAdicional +
    "</factura>"
  );
}
