import { Platform } from "react-native";
import { db } from "../db";
import { configuracion } from "../db/schema";
import { eq } from "drizzle-orm";
import { formatDate, formatTime, formatCurrency } from "../utils/dates";

// Import condicional para evitar errores en desarrollo web
let BluetoothEscposPrinter: any = null;
let BluetoothManager: any = null;

try {
  const printer = require("react-native-bluetooth-escpos-printer");
  BluetoothEscposPrinter = printer.BluetoothEscposPrinter;
  BluetoothManager = printer.BluetoothManager;
} catch (e) {
  console.warn("Impresora Bluetooth no disponible en este entorno");
}

// ─── TIPOS ────────────────────────────────────────────────
export interface DatosTicket {
  negocio: string;
  fecha: string; // ISO string
  items: {
    nombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
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
export async function conectarImpresora(mac: string): Promise<boolean> {
  if (!BluetoothManager) return false;
  try {
    await BluetoothManager.connect(mac);
    return true;
  } catch (e) {
    console.error("Error conectando impresora:", e);
    return false;
  }
}

// ─── IMPRIMIR TICKET ──────────────────────────────────────
export async function imprimirTicket(datos: DatosTicket): Promise<boolean> {
  if (!BluetoothEscposPrinter) return false;

  try {
    const mac = await getImpresoraMac();
    if (!mac) return false;

    const conectado = await conectarImpresora(mac);
    if (!conectado) return false;

    const { ALIGN } = BluetoothEscposPrinter;

    // Encabezado
    await BluetoothEscposPrinter.printerAlign(ALIGN.CENTER);
    await BluetoothEscposPrinter.printText(datos.negocio + "\n", { widthtimes: 1, heigthtimes: 1 });
    await BluetoothEscposPrinter.printText("--------------------------------\n", {});
    await BluetoothEscposPrinter.printText(formatDate(datos.fecha) + " " + formatTime(datos.fecha) + "\n", {});
    await BluetoothEscposPrinter.printText("--------------------------------\n", {});

    // Items
    await BluetoothEscposPrinter.printerAlign(ALIGN.LEFT);
    for (const item of datos.items) {
      await BluetoothEscposPrinter.printText(
        `${item.nombre} x${item.cantidad}`.padEnd(24) + formatCurrency(item.subtotal).padStart(8) + "\n",
        {}
      );
    }

    // Total
    await BluetoothEscposPrinter.printText("--------------------------------\n", {});
    await BluetoothEscposPrinter.printerAlign(ALIGN.RIGHT);
    await BluetoothEscposPrinter.printText(
      "TOTAL: " + formatCurrency(datos.total) + "\n",
      { widthtimes: 1, heigthtimes: 1 }
    );
    await BluetoothEscposPrinter.printText(
      "Pago: " + datos.metodoPago.toUpperCase() + "\n",
      {}
    );

    // Pie
    await BluetoothEscposPrinter.printerAlign(ALIGN.CENTER);
    await BluetoothEscposPrinter.printText("\nGracias por su compra!\n", {});
    await BluetoothEscposPrinter.printText("--------------------------------\n", {});

    // Avance de papel
    await BluetoothEscposPrinter.printText("\n\n\n", {});

    return true;
  } catch (e) {
    console.error("Error imprimiendo ticket:", e);
    return false;
  }
}

// ─── ESCANEAR DISPOSITIVOS BLUETOOTH ─────────────────────
export async function escanearDispositivos(): Promise<{ name: string; address: string }[]> {
  if (!BluetoothManager) return [];
  try {
    const paired = await BluetoothManager.enableBluetooth();
    return paired ?? [];
  } catch (e) {
    console.error("Error escaneando Bluetooth:", e);
    return [];
  }
}
