import { db } from "../db";
import { configuracion } from "../db/schema";
import { eq } from "drizzle-orm";
import CryptoJS from "crypto-js";

const PIN_KEY = "pin_hash";

export function hashPin(pin: string): string {
  return CryptoJS.SHA256(pin).toString();
}

export async function verificarPin(pin: string): Promise<boolean> {
  const result = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.clave, PIN_KEY))
    .limit(1);

  const stored = result[0]?.valor ?? "";

  // Si no hay PIN configurado, cualquier PIN de 4 dígitos pasa (primer uso)
  if (!stored) return pin.length === 4;

  return hashPin(pin) === stored;
}

export async function cambiarPin(pinNuevo: string): Promise<void> {
  if (pinNuevo.length !== 4) throw new Error("El PIN debe tener 4 dígitos");
  const hashed = hashPin(pinNuevo);
  await db
    .update(configuracion)
    .set({ valor: hashed })
    .where(eq(configuracion.clave, PIN_KEY));
}

export async function hayPinConfigurado(): Promise<boolean> {
  const result = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.clave, PIN_KEY))
    .limit(1);
  return !!result[0]?.valor;
}
