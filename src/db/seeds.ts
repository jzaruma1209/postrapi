import { db } from "./index";
import { configuracion, ingredientes, productos, recetas } from "./schema";
import { generateId } from "../utils/uuid";
import { nowISO } from "../utils/dates";

export async function runSeeds(): Promise<void> {
  // Verificar si ya hay datos para no duplicar
  const existing = await db.select().from(productos).limit(1);
  if (existing.length > 0) {
    console.log("Seeds ya ejecutados, omitiendo...");
    return;
  }

  // ─── INGREDIENTES ─────────────────────────────────────
  const ingPapas = { id: generateId(), nombre: "Papas", unidad: "kg", stockActual: 10, stockMinimo: 2, created_at: nowISO(), synced: 0 };
  const ingPollo = { id: generateId(), nombre: "Pollo", unidad: "kg", stockActual: 8, stockMinimo: 2, created_at: nowISO(), synced: 0 };
  const ingSalchicha = { id: generateId(), nombre: "Salchichas", unidad: "kg", stockActual: 5, stockMinimo: 1, created_at: nowISO(), synced: 0 };
  const ingAceite = { id: generateId(), nombre: "Aceite", unidad: "litros", stockActual: 4, stockMinimo: 1, created_at: nowISO(), synced: 0 };
  const ingSal = { id: generateId(), nombre: "Sal", unidad: "kg", stockActual: 2, stockMinimo: 0.5, created_at: nowISO(), synced: 0 };
  const ingGaseosa = { id: generateId(), nombre: "Gaseosa", unidad: "unidades", stockActual: 24, stockMinimo: 6, created_at: nowISO(), synced: 0 };
  const ingPan = { id: generateId(), nombre: "Pan de hamburguesa", unidad: "unidades", stockActual: 20, stockMinimo: 5, created_at: nowISO(), synced: 0 };
  const ingQueso = { id: generateId(), nombre: "Queso", unidad: "kg", stockActual: 2, stockMinimo: 0.5, created_at: nowISO(), synced: 0 };

  await db.insert(ingredientes).values([
    ingPapas, ingPollo, ingSalchicha, ingAceite, ingSal, ingGaseosa, ingPan, ingQueso
  ]);

  // ─── PRODUCTOS ────────────────────────────────────────
  const prodPapaPollo = { id: generateId(), nombre: "Papa con pollo", precio: 5.50, activo: 1, created_at: nowISO(), synced: 0 };
  const prodSalchipapa = { id: generateId(), nombre: "Salchipapa", precio: 4.00, activo: 1, created_at: nowISO(), synced: 0 };
  const prodComboFamiliar = { id: generateId(), nombre: "Combo familiar", precio: 12.00, activo: 1, created_at: nowISO(), synced: 0 };
  const prodGaseosa = { id: generateId(), nombre: "Gaseosa", precio: 1.50, activo: 1, created_at: nowISO(), synced: 0 };
  const prodHamburguesa = { id: generateId(), nombre: "Hamburguesa", precio: 6.00, activo: 1, created_at: nowISO(), synced: 0 };

  await db.insert(productos).values([
    prodPapaPollo, prodSalchipapa, prodComboFamiliar, prodGaseosa, prodHamburguesa
  ]);

  // ─── RECETAS ──────────────────────────────────────────
  // Papa con pollo: 0.3kg papas + 0.2kg pollo + 0.05L aceite + 0.01kg sal
  await db.insert(recetas).values([
    { id: generateId(), productoId: prodPapaPollo.id, ingredienteId: ingPapas.id, cantidad: 0.3, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodPapaPollo.id, ingredienteId: ingPollo.id, cantidad: 0.2, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodPapaPollo.id, ingredienteId: ingAceite.id, cantidad: 0.05, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodPapaPollo.id, ingredienteId: ingSal.id, cantidad: 0.01, created_at: nowISO(), synced: 0 },
  ]);

  // Salchipapa: 0.25kg papas + 0.15kg salchichas + 0.05L aceite
  await db.insert(recetas).values([
    { id: generateId(), productoId: prodSalchipapa.id, ingredienteId: ingPapas.id, cantidad: 0.25, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodSalchipapa.id, ingredienteId: ingSalchicha.id, cantidad: 0.15, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodSalchipapa.id, ingredienteId: ingAceite.id, cantidad: 0.05, created_at: nowISO(), synced: 0 },
  ]);

  // Combo familiar: 0.5kg papas + 0.4kg pollo + 0.1L aceite + 2 gaseosas
  await db.insert(recetas).values([
    { id: generateId(), productoId: prodComboFamiliar.id, ingredienteId: ingPapas.id, cantidad: 0.5, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodComboFamiliar.id, ingredienteId: ingPollo.id, cantidad: 0.4, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodComboFamiliar.id, ingredienteId: ingAceite.id, cantidad: 0.1, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodComboFamiliar.id, ingredienteId: ingGaseosa.id, cantidad: 2, created_at: nowISO(), synced: 0 },
  ]);

  // Gaseosa: 1 unidad
  await db.insert(recetas).values([
    { id: generateId(), productoId: prodGaseosa.id, ingredienteId: ingGaseosa.id, cantidad: 1, created_at: nowISO(), synced: 0 },
  ]);

  // Hamburguesa: 1 pan + 0.15kg pollo + 0.05kg queso
  await db.insert(recetas).values([
    { id: generateId(), productoId: prodHamburguesa.id, ingredienteId: ingPan.id, cantidad: 1, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodHamburguesa.id, ingredienteId: ingPollo.id, cantidad: 0.15, created_at: nowISO(), synced: 0 },
    { id: generateId(), productoId: prodHamburguesa.id, ingredienteId: ingQueso.id, cantidad: 0.05, created_at: nowISO(), synced: 0 },
  ]);

  console.log("✅ Seeds ejecutados: 8 ingredientes, 5 productos, recetas vinculadas");
}
