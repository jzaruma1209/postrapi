import { create } from "zustand";
import type { ItemVenta } from "../services/ventas.service";

interface VentasStore {
  carrito: ItemVenta[];
  agregarItem: (item: ItemVenta) => void;
  quitarItem: (productoId: string) => void;
  actualizarCantidad: (productoId: string, cantidad: number) => void;
  limpiarCarrito: () => void;
  totalCarrito: () => number;
}

export const useVentasStore = create<VentasStore>((set, get) => ({
  carrito: [],

  agregarItem: (item) => {
    const { carrito } = get();
    const existente = carrito.find((i) => i.productoId === item.productoId);
    if (existente) {
      set({
        carrito: carrito.map((i) =>
          i.productoId === item.productoId
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        ),
      });
    } else {
      set({ carrito: [...carrito, { ...item, cantidad: 1 }] });
    }
  },

  quitarItem: (productoId) => {
    set({ carrito: get().carrito.filter((i) => i.productoId !== productoId) });
  },

  actualizarCantidad: (productoId, cantidad) => {
    if (cantidad <= 0) {
      get().quitarItem(productoId);
      return;
    }
    set({
      carrito: get().carrito.map((i) =>
        i.productoId === productoId ? { ...i, cantidad } : i
      ),
    });
  },

  limpiarCarrito: () => set({ carrito: [] }),

  totalCarrito: () =>
    get().carrito.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0),
}));
