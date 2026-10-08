// Catálogos y tipos de la facturación electrónica del SRI (esquema offline).
// Fuente: Ficha técnica de comprobantes electrónicos del SRI. Antes de pasar a
// producción, verificar estos códigos contra la versión vigente (ver
// seguimiento/FACTURACION.md).

export const TIPO_COMPROBANTE = {
  factura: "01",
  notaCredito: "04",
} as const;

export const AMBIENTE = {
  pruebas: "1",
  produccion: "2",
} as const;
export type Ambiente = (typeof AMBIENTE)[keyof typeof AMBIENTE];

export const TIPO_EMISION_NORMAL = "1";

export const TIPO_IDENTIFICACION = {
  ruc: "04",
  cedula: "05",
  pasaporte: "06",
  consumidorFinal: "07",
} as const;
export type TipoIdentificacion = (typeof TIPO_IDENTIFICACION)[keyof typeof TIPO_IDENTIFICACION];

export const CONSUMIDOR_FINAL = {
  tipoIdentificacion: TIPO_IDENTIFICACION.consumidorFinal,
  identificacion: "9999999999999",
  razonSocial: "CONSUMIDOR FINAL",
} as const;

// Código de impuesto 2 = IVA. codigoPorcentaje según la tabla de tarifas del SRI.
export const CODIGO_IMPUESTO_IVA = "2";
export const CODIGO_PORCENTAJE_IVA: Record<number, string> = {
  0: "0",
  5: "5",
  12: "2",
  14: "3",
  15: "4",
};

export const FORMA_PAGO = {
  efectivo: "01", // sin utilización del sistema financiero
  transferencia: "20", // otros con utilización del sistema financiero
  tarjetaDebito: "16",
  tarjetaCredito: "19",
} as const;

export interface Emisor {
  ambiente: Ambiente;
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  dirMatriz: string;
  dirEstablecimiento: string;
  estab: string; // 3 dígitos, p. ej. "001"
  ptoEmi: string; // 3 dígitos, uno por caja/dispositivo
  obligadoContabilidad: boolean;
  // Leyenda RIMPE si aplica, p. ej. "CONTRIBUYENTE RÉGIMEN RIMPE"
  contribuyenteRimpe?: string;
}

export interface Comprador {
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  razonSocial: string;
  direccion?: string;
  email?: string;
}

export interface ItemParaFacturar {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio: number; // precio de venta por unidad, tal como está en el menú
}

export interface LineaFactura {
  codigoPrincipal: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number; // sin IVA, hasta 6 decimales
  descuento: number; // sin IVA
  precioTotalSinImpuesto: number;
  codigoPorcentajeIva: string;
  tarifaIva: number;
  valorIva: number;
}

export interface TotalImpuesto {
  codigoPorcentaje: string;
  baseImponible: number;
  valor: number;
}

export interface TotalesFactura {
  totalSinImpuestos: number;
  totalDescuento: number;
  impuestos: TotalImpuesto[];
  propina: number;
  importeTotal: number;
}

export interface Pago {
  formaPago: string;
  total: number;
}

export interface DatosFactura {
  emisor: Emisor;
  comprador: Comprador;
  fechaEmision: string; // dd/mm/aaaa
  secuencial: string; // 9 dígitos
  claveAcceso: string; // 49 dígitos
  lineas: LineaFactura[];
  totales: TotalesFactura;
  pagos: Pago[];
  infoAdicional?: Record<string, string>;
}
