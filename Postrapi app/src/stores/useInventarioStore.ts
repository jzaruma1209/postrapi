import { create } from "zustand";
import type { Ingrediente } from "../db/schema";

interface InventarioStore {
  ingredientes: Ingrediente[];
  stockBajo: Ingrediente[];
  setIngredientes: (items: Ingrediente[]) => void;
  setStockBajo: (items: Ingrediente[]) => void;
}

export const useInventarioStore = create<InventarioStore>((set) => ({
  ingredientes: [],
  stockBajo: [],
  setIngredientes: (items) => set({ ingredientes: items }),
  setStockBajo: (items) => set({ stockBajo: items }),
}));
