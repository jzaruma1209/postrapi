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
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

export default function VentasIndex() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
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

      const conf = await db.select().from(configuracion).where(eq(configuracion.clave, "nombre_negocio")).limit(1);
      const negocio = conf[0]?.valor || "Postrapi";

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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 16,
          backgroundColor: colors.bg,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>Nueva Venta</Text>
        
        <View style={{ backgroundColor: "#F97316", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>Total: ${totalCarrito.toFixed(2)}</Text>
        </View>
      </View>

      {/* Sub-navegación (Chips de módulos) */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: "#F97316", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Nueva Venta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/ventas/historial")}
            style={{
              backgroundColor: colors.bgCard,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Historial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/ventas/caja")}
            style={{
              backgroundColor: colors.bgCard,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Caja</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Categorías */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={{
              backgroundColor: isDark ? "#1e1e1e" : "#fff4e6",
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: "#F97316",
            }}
          >
            <Text style={{ color: "#F97316", fontSize: 12, fontWeight: "600" }}>Todos</Text>
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
                  backgroundColor: colors.bgCard,
                  borderRadius: 12,
                  borderWidth: isDark ? 0.5 : 1,
                  borderColor: colors.border,
                  padding: 12,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: isDark ? "#2a1a00" : "#fff4e6",
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Feather name="box" size={20} color="#F97316" />
                </View>

                <Text style={{ fontSize: 12, color: colors.textLight, textAlign: "center", marginBottom: 4 }} numberOfLines={2}>
                  {prod.nombre}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#F97316", marginBottom: 10 }}>
                  ${prod.precio.toFixed(2)}
                </Text>

                {qty > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.bgInput,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#F97316",
                      width: "100%",
                      justifyContent: "space-between",
                    }}
                  >
                    <TouchableOpacity onPress={() => actualizarCantidad(prod.id, qty - 1)} style={{ padding: 8 }}>
                      <Feather name="minus" size={14} color="#F97316" />
                    </TouchableOpacity>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{qty}</Text>
                    <TouchableOpacity onPress={() => actualizarCantidad(prod.id, qty + 1)} style={{ padding: 8 }}>
                      <Feather name="plus" size={14} color="#F97316" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleAgregar(prod)}
                    style={{ backgroundColor: "#F97316", borderRadius: 8, paddingVertical: 7, width: "100%", alignItems: "center" }}
                  >
                    <Feather name="plus" size={15} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
        {listaProductos.length === 0 && (
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
            No hay productos activos.
          </Text>
        )}
      </ScrollView>

      {/* Barra Inferior (Carrito) */}
      {carrito.length > 0 && (
        <View
          style={{
            backgroundColor: colors.bgCard,
            padding: 16,
            borderTopWidth: isDark ? 0.5 : 1,
            borderTopColor: colors.border,
            flexDirection: "row",
            gap: 12,
            ...(isDark ? {} : (colors.shadow ?? {})),
          }}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "transparent",
              borderWidth: 1.5,
              borderColor: "#F97316",
              borderRadius: 10,
              padding: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#F97316", fontWeight: "600", fontSize: 13 }}>Registrar pedido</Text>
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
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>Cobrar ahora</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Cobro */}
      <Modal visible={modalCobro} transparent animationType="slide" onRequestClose={() => setModalCobro(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            {/* Handle */}
            <View style={{ width: 36, height: 4, backgroundColor: colors.bgInput, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />

            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 16, textAlign: "center" }}>
              Resumen de Cobro
            </Text>

            <View style={{ maxHeight: 200, marginBottom: 16 }}>
              <ScrollView>
                {carrito.map(item => (
                  <View key={item.productoId} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ color: colors.textLight, fontSize: 13 }}>{item.cantidad}x {item.nombre}</Text>
                    <Text style={{ color: colors.text, fontSize: 13 }}>${(item.cantidad * item.precioUnitario).toFixed(2)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginBottom: 24 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}>Total a Pagar</Text>
              <Text style={{ color: "#F97316", fontSize: 18, fontWeight: "bold" }}>${totalCarrito.toFixed(2)}</Text>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Método de Pago</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setMetodoPago("efectivo")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: metodoPago === "efectivo" ? "#F97316" : colors.border,
                  backgroundColor: metodoPago === "efectivo" ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: metodoPago === "efectivo" ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "600" }}>Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMetodoPago("transferencia")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: metodoPago === "transferencia" ? "#F97316" : colors.border,
                  backgroundColor: metodoPago === "transferencia" ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: metodoPago === "transferencia" ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "600" }}>Transferencia</Text>
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
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={confirmarVenta}
                disabled={procesando}
                style={{
                  flex: 1,
                  backgroundColor: procesando ? "#aaa" : "#F97316",
                  padding: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>{procesando ? "Procesando..." : "Confirmar Venta"}</Text>
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
