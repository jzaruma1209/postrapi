import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { db } from "../../../src/db";
import { productos, Producto } from "../../../src/db/schema";
import { useVentasStore } from "../../../src/stores/useVentasStore";
import { crearVenta } from "../../../src/services/ventas.service";
import type { MetodoPago } from "../../../src/utils/types";
import { configuracion } from "../../../src/db/schema";
import TicketModal from "../../../src/components/shared/TicketModal";
import type { DatosTicket } from "../../../src/services/printer.service";

export default function VentasIndex() {
  const router = useRouter();
  const [listaProductos, setListaProductos] = useState<Producto[]>([]);
  
  // Zustand Store
  const carrito = useVentasStore((state) => state.carrito);
  const agregarItem = useVentasStore((state) => state.agregarItem);
  const actualizarCantidad = useVentasStore((state) => state.actualizarCantidad);
  const limpiarCarrito = useVentasStore((state) => state.limpiarCarrito);
  const totalCarrito = useVentasStore((state) => state.totalCarrito());

  // Cobro Modal State
  const [modalCobro, setModalCobro] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [procesando, setProcesando] = useState(false);

  // Ticket Modal State
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [ticketDatos, setTicketDatos] = useState<DatosTicket | null>(null);

  const cargarProductos = async () => {
    try {
      const data = await db.select().from(productos).where(eq(productos.activo, 1));
      setListaProductos(data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [])
  );

  const getCantidadEnCarrito = (productoId: string) => {
    const item = carrito.find((i) => i.productoId === productoId);
    return item ? item.cantidad : 0;
  };

  const handleAgregar = (prod: Producto) => {
    agregarItem({
      productoId: prod.id,
      nombre: prod.nombre,
      precioUnitario: prod.precio,
      cantidad: 1,
    });
  };

  const confirmarVenta = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    try {
      const ventaId = await crearVenta({
        items: carrito,
        metodoPago,
      });

      // Obtener nombre del negocio
      const conf = await db.select().from(configuracion).where(eq(configuracion.clave, "nombre_negocio")).limit(1);
      const negocio = conf[0]?.valor || "Postrapi";

      // Preparar datos del ticket
      const ticket: DatosTicket = {
        negocio,
        fecha: new Date().toISOString(),
        items: carrito.map(i => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          subtotal: i.cantidad * i.precioUnitario
        })),
        total: totalCarrito,
        metodoPago,
        ventaId
      };

      limpiarCarrito();
      setModalCobro(false);
      
      // Mostrar ticket
      setTicketDatos(ticket);
      setMostrarTicket(true);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo procesar la venta.");
    } finally {
      setProcesando(false);
    }
  };

  const cerrarTicket = () => {
    setMostrarTicket(false);
    setTicketDatos(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#141414" }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 16,
          backgroundColor: "#141414",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>Nueva Venta</Text>
        
        <View style={{ backgroundColor: "#F97316", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>Total: ${totalCarrito.toFixed(2)}</Text>
        </View>
      </View>

      {/* Sub-navegación (Chips de módulos) */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: "#F97316", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "500" }}>Nueva Venta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/ventas/historial")}
            style={{ backgroundColor: "#2a2a2a", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: "#333" }}
          >
            <Text style={{ color: "#888", fontSize: 11 }}>Historial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/ventas/caja")}
            style={{ backgroundColor: "#2a2a2a", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: "#333" }}
          >
            <Text style={{ color: "#888", fontSize: 11 }}>Caja</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Categorías (Placeholder v1) */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: "#1e1e1e", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: "#F97316" }}
          >
            <Text style={{ color: "#F97316", fontSize: 11, fontWeight: "500" }}>Todos</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Grid de Productos */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
          {listaProductos.map((prod) => {
            const qty = getCantidadEnCarrito(prod.id);
            return (
              <View
                key={prod.id}
                style={{
                  width: "48%",
                  backgroundColor: "#1e1e1e",
                  borderRadius: 12,
                  borderWidth: 0.5,
                  borderColor: "#2a2a2a",
                  padding: 10,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: "#2a2a2a",
                    borderRadius: 8,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Feather name="box" size={20} color="#F97316" />
                </View>

                <Text style={{ fontSize: 11, color: "#ccc", textAlign: "center", marginBottom: 4 }} numberOfLines={2}>
                  {prod.nombre}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#F97316", marginBottom: 12 }}>
                  ${prod.precio.toFixed(2)}
                </Text>

                {qty > 0 ? (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#2a2a2a", borderRadius: 6, borderWidth: 0.5, borderColor: "#F97316", width: "100%", justifyContent: "space-between" }}>
                    <TouchableOpacity onPress={() => actualizarCantidad(prod.id, qty - 1)} style={{ padding: 6 }}>
                      <Feather name="minus" size={14} color="#F97316" />
                    </TouchableOpacity>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>{qty}</Text>
                    <TouchableOpacity onPress={() => actualizarCantidad(prod.id, qty + 1)} style={{ padding: 6 }}>
                      <Feather name="plus" size={14} color="#F97316" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleAgregar(prod)}
                    style={{ backgroundColor: "#F97316", borderRadius: 6, paddingVertical: 6, width: "100%", alignItems: "center" }}
                  >
                    <Feather name="plus" size={14} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
        {listaProductos.length === 0 && (
          <Text style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
            No hay productos activos.
          </Text>
        )}
      </ScrollView>

      {/* Barra Inferior (Carrito) */}
      {carrito.length > 0 && (
        <View style={{ backgroundColor: "#1e1e1e", padding: 16, borderTopWidth: 0.5, borderTopColor: "#2a2a2a", flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: "#F97316",
              borderRadius: 10,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#F97316", fontWeight: "500", fontSize: 13 }}>Registrar pedido</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setModalCobro(true)}
            style={{
              flex: 1,
              backgroundColor: "#F97316",
              borderRadius: 10,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "500", fontSize: 13 }}>Cobrar ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Cobro */}
      <Modal visible={modalCobro} transparent animationType="slide" onRequestClose={() => setModalCobro(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#1e1e1e",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "500", color: "#fff", marginBottom: 16, textAlign: "center" }}>
              Resumen de Cobro
            </Text>

            <View style={{ maxHeight: 200, marginBottom: 16 }}>
              <ScrollView>
                {carrito.map(item => (
                  <View key={item.productoId} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ color: "#ccc", fontSize: 13 }}>{item.cantidad}x {item.nombre}</Text>
                    <Text style={{ color: "#fff", fontSize: 13 }}>${(item.cantidad * item.precioUnitario).toFixed(2)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#333", paddingTop: 16, marginBottom: 24 }}>
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}>Total a Pagar</Text>
              <Text style={{ color: "#F97316", fontSize: 18, fontWeight: "bold" }}>${totalCarrito.toFixed(2)}</Text>
            </View>

            <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Método de Pago</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setMetodoPago("efectivo")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: metodoPago === "efectivo" ? "#F97316" : "#333",
                  backgroundColor: metodoPago === "efectivo" ? "#2a1a00" : "#2a2a2a",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: metodoPago === "efectivo" ? "#F97316" : "#ccc", fontSize: 13, fontWeight: "500" }}>Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMetodoPago("transferencia")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: metodoPago === "transferencia" ? "#F97316" : "#333",
                  backgroundColor: metodoPago === "transferencia" ? "#2a1a00" : "#2a2a2a",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: metodoPago === "transferencia" ? "#F97316" : "#ccc", fontSize: 13, fontWeight: "500" }}>Transferencia</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setModalCobro(false)}
                disabled={procesando}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "#555",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#ccc", fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={confirmarVenta}
                disabled={procesando}
                style={{
                  flex: 1,
                  backgroundColor: procesando ? "#888" : "#F97316",
                  padding: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "500" }}>{procesando ? "Procesando..." : "Confirmar Venta"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Ticket */}
      <TicketModal 
        visible={mostrarTicket}
        datos={ticketDatos}
        onClose={cerrarTicket}
      />
    </View>
  );
}
