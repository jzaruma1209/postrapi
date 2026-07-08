import { Platform } from "react-native";
import { db } from "../db";
import { configuracion } from "../db/schema";
import { eq } from "drizzle-orm";
import { formatDate, formatTime, formatCurrency } from "../utils/dates";

// [DESACTIVADO para v1] Import condicional de react-native-bluetooth-escpos-printer
// let BluetoothEscposPrinter: any = null;
// let BluetoothManager: any = null;
//
// try {
//   const printer = require("react-native-bluetooth-escpos-printer");
//   BluetoothEscposPrinter = printer.BluetoothEscposPrinter;
//   BluetoothManager = printer.BluetoothManager;
// } catch (e) {
//   console.warn("Impresora Bluetooth no disponible en este entorno");
// }

// ─── TIPOS ────────────────────────────────────────────────
export interface DatosTicket {
  negocio: string;
  fecha: string; // ISO string
  numeroVenta?: number;
  items: {
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  subtotal: number;
  descuentoTipo?: string | null;
  descuentoValor?: number | null;
  total: number;
  metodoPago: string;
  ventaId: string;
}

// ─── VERIFICAR SI HAY IMPRESORA CONFIGURADA ───────────────
export async function hayImpresoraConfigurada(): Promise<boolean> {
  const result = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.clave, "impresora_mac"))
    .limit(1);
  return !!result[0]?.valor;
}

export async function getImpresoraMac(): Promise<string> {
  const result = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.clave, "impresora_mac"))
    .limit(1);
  return result[0]?.valor ?? "";
}

// ─── CONECTAR IMPRESORA ───────────────────────────────────
export async function conectarImpresora(_mac: string): Promise<boolean> {
  console.warn("Impresión Bluetooth desactivada temporalmente - pendiente para v2");
  return false;
}

// ─── IMPRIMIR TICKET ──────────────────────────────────────
export async function imprimirTicket(_datos: DatosTicket): Promise<boolean> {
  console.warn("Impresión Bluetooth desactivada temporalmente - pendiente para v2");
  return false;
}

// ─── ESCANEAR DISPOSITIVOS BLUETOOTH ─────────────────────
export async function escanearDispositivos(): Promise<{ name: string; address: string }[]> {
  console.warn("Impresión Bluetooth desactivada temporalmente - pendiente para v2");
  return [];
}
