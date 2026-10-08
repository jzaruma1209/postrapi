import { db } from "../db";
import { comprobantes, configuracion, productos, ventaItems, ventas } from "../db/schema";
import { desc, eq, inArray, like } from "drizzle-orm";
import { generateId } from "../utils/uuid";
import { fechaLocal, nowISO } from "../utils/dates";
import { conTransaccion } from "../db/transaccion";
import { calcularFactura } from "../facturacion/impuestos";
import { construirXmlFactura } from "../facturacion/xmlFactura";
import { codigoNumericoAleatorio, formatearSecuencial, generarClaveAcceso } from "../facturacion/claveAcceso";
import { validarCedula, validarRuc } from "../facturacion/identificacion";
import {
  AMBIENTE,
  CODIGO_PORCENTAJE_IVA,
  CONSUMIDOR_FINAL,
  FORMA_PAGO,
  TIPO_COMPROBANTE,
  TIPO_EMISION_NORMAL,
  type Ambiente,
  type Comprador,
  type Emisor,
} from "../facturacion/tipos";

// Claves en la tabla `configuracion` para los datos del emisor.
const CLAVES = {
  ruc: "fact_ruc",
  razonSocial: "fact_razon_social",
  nombreComercial: "fact_nombre_comercial",
  dirMatriz: "fact_dir_matriz",
  dirEstablecimiento: "fact_dir_establecimiento",
  estab: "fact_estab",
  ptoEmi: "fact_pto_emi",
  ambiente: "fact_ambiente",
  obligadoContabilidad: "fact_obligado_contabilidad",
  contribuyenteRimpe: "fact_contribuyente_rimpe",
  tarifaIva: "fact_tarifa_iva",
  preciosIncluyenIva: "fact_precios_incluyen_iva",
  ultimoSecuencial: "fact_ultimo_secuencial",
} as const;
type CampoConfig = keyof typeof CLAVES;

export interface ConfigFacturacion {
  emisor: Emisor;
  tarifaIva: number;
  preciosIncluyenIva: boolean;
  ultimoSecuencial: number;
}

export type Comprobante = typeof comprobantes.$inferSelect;

export async function getConfigFacturacion(): Promise<ConfigFacturacion | null> {
  const filas = await db.select().from(configuracion).where(like(configuracion.clave, "fact_%"));
  const v = (campo: CampoConfig) => filas.find((f) => f.clave === CLAVES[campo])?.valor ?? "";
  if (!v("ruc") || !v("razonSocial") || !v("dirMatriz")) return null;

  return {
    emisor: {
      ambiente: (v("ambiente") || AMBIENTE.pruebas) as Ambiente,
      ruc: v("ruc"),
      razonSocial: v("razonSocial"),
      nombreComercial: v("nombreComercial") || undefined,
      dirMatriz: v("dirMatriz"),
      dirEstablecimiento: v("dirEstablecimiento") || v("dirMatriz"),
      estab: v("estab") || "001",
      ptoEmi: v("ptoEmi") || "001",
      obligadoContabilidad: v("obligadoContabilidad") === "SI",
      contribuyenteRimpe: v("contribuyenteRimpe") || undefined,
    },
    tarifaIva: Number(v("tarifaIva") || 15),
    preciosIncluyenIva: v("preciosIncluyenIva") !== "NO",
    ultimoSecuencial: Number(v("ultimoSecuencial") || 0),
  };
}

export async function guardarConfigFacturacion(
  cambios: Partial<Record<Exclude<CampoConfig, "ultimoSecuencial">, string>>
): Promise<void> {
  if (cambios.ruc !== undefined && !validarRuc(cambios.ruc)) {
    throw new Error("El RUC no es válido");
  }
  for (const campo of ["estab", "ptoEmi"] as const) {
    const valor = cambios[campo];
    if (valor !== undefined && !/^\d{3}$/.test(valor)) {
      throw new Error(`El ${campo === "estab" ? "establecimiento" : "punto de emisión"} debe tener 3 dígitos (p. ej. 001)`);
    }
  }
  for (const [campo, valor] of Object.entries(cambios)) {
    if (valor === undefined) continue;
    await guardarClave(CLAVES[campo as CampoConfig], valor.trim());
  }
}

async function guardarClave(clave: string, valor: string): Promise<void> {
  await db
    .insert(configuracion)
    .values({ clave, valor })
    .onConflictDoUpdate({ target: configuracion.clave, set: { valor } });
}

export function validarComprador(c: Comprador): void {
  if (c.tipoIdentificacion === "05" && !validarCedula(c.identificacion)) throw new Error("La cédula no es válida");
  if (c.tipoIdentificacion === "04" && !validarRuc(c.identificacion)) throw new Error("El RUC no es válido");
  if (c.tipoIdentificacion !== "07" && !c.razonSocial.trim()) throw new Error("Falta el nombre o razón social del cliente");
}

// Convierte una venta ya cobrada en una factura lista para firmar y enviar.
// Queda en estado "pendiente": la firma y el envío al SRI los hace el servidor (fase 2).
export function prepararFacturaDeVenta(ventaId: string, comprador?: Comprador): Promise<Comprobante> {
  return conTransaccion(() => prepararFacturaSinTx(ventaId, comprador));
}

async function prepararFacturaSinTx(ventaId: string, compradorEntrada?: Comprador): Promise<Comprobante> {
  const config = await getConfigFacturacion();
  if (!config) throw new Error("Primero configura los datos de facturación (RUC, razón social y dirección).");

  const [venta] = await db.select().from(ventas).where(eq(ventas.id, ventaId)).limit(1);
  if (!venta) throw new Error("Venta no encontrada.");
  if (venta.anulada === 1) throw new Error("No se puede facturar una venta anulada.");

  const [existente] = await db.select().from(comprobantes).where(eq(comprobantes.ventaId, ventaId)).limit(1);
  if (existente) throw new Error("Esta venta ya tiene una factura.");

  const comprador: Comprador = compradorEntrada ?? { ...CONSUMIDOR_FINAL };
  validarComprador(comprador);

  const items = await db.select().from(ventaItems).where(eq(ventaItems.ventaId, ventaId));
  if (items.length === 0) throw new Error("La venta no tiene productos.");
  const prods = await db
    .select({ id: productos.id, nombre: productos.nombre })
    .from(productos)
    .where(inArray(productos.id, items.map((i) => i.productoId)));
  const nombre = (id: string) => prods.find((p) => p.id === id)?.nombre ?? "Producto";

  const codigoPorcentajeIva = CODIGO_PORCENTAJE_IVA[config.tarifaIva];
  if (!codigoPorcentajeIva) throw new Error(`Tarifa de IVA no soportada: ${config.tarifaIva}%`);

  const { lineas, totales } = calcularFactura(
    items.map((i) => ({ codigo: i.productoId, descripcion: nombre(i.productoId), cantidad: i.cantidad, precio: i.precioUnitario })),
    {
      tarifaIva: config.tarifaIva,
      codigoPorcentajeIva,
      preciosIncluyenIva: config.preciosIncluyenIva,
      descuentoTotal: Math.max(venta.subtotal - venta.total, 0),
    }
  );

  const numero = config.ultimoSecuencial + 1;
  const secuencial = formatearSecuencial(numero);
  const [a, m, d] = fechaLocal(new Date(venta.created_at)).split("-");
  const fechaEmision = `${d}/${m}/${a}`;
  const { emisor } = config;
  const claveAcceso = generarClaveAcceso({
    fechaEmision,
    tipoComprobante: TIPO_COMPROBANTE.factura,
    ruc: emisor.ruc,
    ambiente: emisor.ambiente,
    estab: emisor.estab,
    ptoEmi: emisor.ptoEmi,
    secuencial,
    codigoNumerico: codigoNumericoAleatorio(),
    tipoEmision: TIPO_EMISION_NORMAL,
  });

  const xml = construirXmlFactura({
    emisor,
    comprador,
    fechaEmision,
    secuencial,
    claveAcceso,
    lineas,
    totales,
    pagos: [{
      formaPago: venta.metodoPago === "transferencia" ? FORMA_PAGO.transferencia : FORMA_PAGO.efectivo,
      total: totales.importeTotal,
    }],
    infoAdicional: comprador.email ? { Email: comprador.email } : undefined,
  });

  const diferencia = Math.abs(totales.importeTotal - venta.total);
  const fila: Comprobante = {
    id: generateId(),
    ventaId,
    tipo: TIPO_COMPROBANTE.factura,
    estab: emisor.estab,
    ptoEmi: emisor.ptoEmi,
    secuencial,
    claveAcceso,
    fechaEmision,
    ambiente: emisor.ambiente,
    identificacionComprador: comprador.identificacion,
    razonSocialComprador: comprador.razonSocial,
    emailComprador: comprador.email ?? null,
    importeTotal: totales.importeTotal,
    estado: "pendiente",
    xml,
    numeroAutorizacion: null,
    fechaAutorizacion: null,
    mensajes: diferencia > 0.009
      ? `Redondeo: la factura suma ${totales.importeTotal.toFixed(2)} y la venta ${venta.total.toFixed(2)}`
      : null,
    intentos: 0,
    created_at: nowISO(),
    synced: 0,
  };

  await db.insert(comprobantes).values(fila);
  await guardarClave(CLAVES.ultimoSecuencial, String(numero));
  return fila;
}

export async function getComprobantes(estado?: string): Promise<Comprobante[]> {
  const consulta = db.select().from(comprobantes);
  const filtrada = estado ? consulta.where(eq(comprobantes.estado, estado)) : consulta;
  return await filtrada.orderBy(desc(comprobantes.created_at));
}

export async function getComprobanteDeVenta(ventaId: string): Promise<Comprobante | null> {
  const [fila] = await db.select().from(comprobantes).where(eq(comprobantes.ventaId, ventaId)).limit(1);
  return fila ?? null;
}
