import type { ItemParaFacturar, LineaFactura, TotalesFactura } from "./tipos";

export function redondear(n: number, decimales = 2): number {
  const f = 10 ** decimales;
  return Math.round((n + Number.EPSILON) * f) / f;
}

// Calcula líneas y totales de una factura con una sola tarifa de IVA.
// Si los precios del menú ya incluyen IVA (lo normal en un restaurante), se
// separa la base del impuesto. El descuento se reparte entre las líneas en
// proporción a su valor.
export function calcularFactura(
  items: ItemParaFacturar[],
  opciones: {
    tarifaIva: number; // p. ej. 15
    codigoPorcentajeIva: string; // p. ej. "4"
    preciosIncluyenIva: boolean;
    descuentoTotal?: number; // en la misma unidad que los precios
    propina?: number;
  }
): { lineas: LineaFactura[]; totales: TotalesFactura } {
  if (items.length === 0) throw new Error("La factura no tiene ítems");

  const divisor = opciones.preciosIncluyenIva ? 1 + opciones.tarifaIva / 100 : 1;
  const brutos = items.map((i) => redondear(i.cantidad * i.precio, 6));
  const totalBruto = brutos.reduce((a, b) => a + b, 0);
  const descuentoTotal = Math.min(Math.max(opciones.descuentoTotal ?? 0, 0), totalBruto);

  let descuentoAsignado = 0;
  const lineas = items.map((item, idx): LineaFactura => {
    const esUltima = idx === items.length - 1;
    const descuentoLinea = esUltima
      ? redondear(descuentoTotal - descuentoAsignado)
      : totalBruto > 0
        ? redondear((descuentoTotal * brutos[idx]) / totalBruto)
        : 0;
    descuentoAsignado += descuentoLinea;

    const precioUnitario = redondear(item.precio / divisor, 6);
    const descuento = redondear(descuentoLinea / divisor);
    const precioTotalSinImpuesto = redondear(item.cantidad * precioUnitario - descuento);
    return {
      codigoPrincipal: item.codigo,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario,
      descuento,
      precioTotalSinImpuesto,
      codigoPorcentajeIva: opciones.codigoPorcentajeIva,
      tarifaIva: opciones.tarifaIva,
      valorIva: redondear((precioTotalSinImpuesto * opciones.tarifaIva) / 100),
    };
  });

  const totalSinImpuestos = redondear(lineas.reduce((a, l) => a + l.precioTotalSinImpuesto, 0));
  const totalDescuento = redondear(lineas.reduce((a, l) => a + l.descuento, 0));
  const valorIva = redondear((totalSinImpuestos * opciones.tarifaIva) / 100);
  const propina = redondear(opciones.propina ?? 0);

  return {
    lineas,
    totales: {
      totalSinImpuestos,
      totalDescuento,
      impuestos: [
        { codigoPorcentaje: opciones.codigoPorcentajeIva, baseImponible: totalSinImpuestos, valor: valorIva },
      ],
      propina,
      importeTotal: redondear(totalSinImpuestos + valorIva + propina),
    },
  };
}
