// ─── STUB WEB ─────────────────────────────────────────────
// Metro carga este archivo en lugar de printer.service.ts cuando
// se compila para web. Evita el crash por módulo nativo no disponible.

export interface DatosTicket {
  negocio: string;
  fecha: string;
  numeroVenta?: number;
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

export async function hayImpresoraConfigurada(): Promise<boolean> {
  return false;
}

export async function getImpresoraMac(): Promise<string> {
  return "";
}

export async function conectarImpresora(_mac: string): Promise<boolean> {
  console.warn("Impresión Bluetooth desactivada temporalmente - pendiente para v2");
  return false;
}

export async function imprimirTicket(_datos: DatosTicket): Promise<boolean> {
  console.warn("Impresión Bluetooth desactivada temporalmente - pendiente para v2");
  return false;
}

export async function escanearDispositivos(): Promise<{ name: string; address: string }[]> {
  console.warn("Impresión Bluetooth desactivada temporalmente - pendiente para v2");
  return [];
}
