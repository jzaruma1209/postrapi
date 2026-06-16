import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { db } from "../../../src/db";
import { productos } from "../../../src/db/schema";
import { getVentaConItems, VentaConItems } from "../../../src/services/ventas.service";

type VentaDetalleState = VentaConItems & {
  itemsConNombre: {
    cantidad: number;
    subtotal: number;
    nombre: string;
    precioUnitario: number;
  }[];
};

export default function DetalleVenta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [detalle, setDetalle] = useState<VentaDetalleState | null>(null);
  const [modalTicket, setModalTicket] = useState(false);

  const cargarDetalle = async () => {
    if (!id) return;
    try {
      const data = await getVentaConItems(id);
      if (data) {
        // Hydrate items with product name
        const itemsConNombre = await Promise.all(
          data.items.map(async (it) => {
            const prod = await db.select().from(productos).where(eq(productos.id, it.productoId)).limit(1);
            return {
              cantidad: it.cantidad,
              subtotal: it.subtotal,
              precioUnitario: it.precioUnitario,
              nombre: prod[0]?.nombre || "Producto Desconocido",
            };
          })
        );
        
        setDetalle({ ...data, itemsConNombre });
      }
    } catch (error) {
      console.error("Error al cargar detalle de venta:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDetalle();
    }, [id])
  );

  const formatFechaHora = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  if (!detalle) {
    return (
      <View style={{ flex: 1, backgroundColor: "#141414", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#888" }}>Cargando...</Text>
      </View>
    );
  }

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
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="arrow-left" size={20} color="#fff" />
          <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>Detalle de Venta</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModalTicket(true)}
          style={{ backgroundColor: "#2a2a2a", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 0.5, borderColor: "#333" }}
        >
          <Text style={{ color: "#F97316", fontSize: 12, fontWeight: "500" }}>Ver Ticket</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ backgroundColor: "#1e1e1e", borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: "#2a2a2a", gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: "#333", paddingBottom: 12 }}>
            <Text style={{ color: "#888", fontSize: 13 }}>Fecha y Hora</Text>
            <Text style={{ color: "#fff", fontSize: 13 }}>{formatFechaHora(detalle.venta.createdAt)}</Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: "#333", paddingBottom: 12 }}>
            <Text style={{ color: "#888", fontSize: 13 }}>Método de Pago</Text>
            <View
              style={{
                backgroundColor: detalle.venta.metodoPago === "efectivo" ? "#001a10" : "#001a2a",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "500", color: detalle.venta.metodoPago === "efectivo" ? "#22c55e" : "#38bdf8", textTransform: "capitalize" }}>
                {detalle.venta.metodoPago}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: "#888", fontSize: 13 }}>ID Venta</Text>
            <Text style={{ color: "#555", fontSize: 11 }}>{detalle.venta.id.split("-")[0]}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: "#1e1e1e", borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: "#2a2a2a", gap: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#fff", marginBottom: 8 }}>Artículos Vendidos</Text>
          
          {detalle.itemsConNombre.map((it, idx) => (
            <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#ccc", fontSize: 13 }}>{it.cantidad}x {it.nombre}</Text>
                <Text style={{ color: "#888", fontSize: 11 }}>${it.precioUnitario.toFixed(2)} c/u</Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>${it.subtotal.toFixed(2)}</Text>
            </View>
          ))}

          <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#333", paddingTop: 16, marginTop: 8 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "500" }}>Total</Text>
            <Text style={{ color: "#F97316", fontSize: 18, fontWeight: "bold" }}>${detalle.venta.total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal Ticket */}
      <Modal visible={modalTicket} transparent animationType="fade" onRequestClose={() => setModalTicket(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View
            style={{
              backgroundColor: "#fffff8", // Color papel
              width: "100%",
              maxWidth: 320,
              padding: 24,
              borderStyle: "dashed",
              borderWidth: 1,
              borderColor: "#ccc",
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold", textAlign: "center", marginBottom: 16, color: "#000" }}>
              POSTRAPI
            </Text>
            <Text style={{ fontSize: 12, textAlign: "center", marginBottom: 24, color: "#333" }}>
              {formatFechaHora(detalle.venta.createdAt)}
            </Text>

            <View style={{ borderBottomWidth: 1, borderBottomColor: "#ccc", borderStyle: "dashed", marginBottom: 12 }} />

            {detalle.itemsConNombre.map((it, idx) => (
              <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 12, color: "#000" }}>{it.cantidad}x {it.nombre.substring(0, 15)}</Text>
                <Text style={{ fontSize: 12, color: "#000" }}>${it.subtotal.toFixed(2)}</Text>
              </View>
            ))}

            <View style={{ borderBottomWidth: 1, borderBottomColor: "#ccc", borderStyle: "dashed", marginTop: 12, marginBottom: 12 }} />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#000" }}>TOTAL</Text>
              <Text style={{ fontSize: 14, fontWeight: "bold", color: "#000" }}>${detalle.venta.total.toFixed(2)}</Text>
            </View>
            
            <Text style={{ fontSize: 10, textAlign: "center", marginTop: 24, color: "#555" }}>
              Pago en {detalle.venta.metodoPago}
            </Text>
            <Text style={{ fontSize: 10, textAlign: "center", marginTop: 4, color: "#555" }}>
              ¡Gracias por tu compra!
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setModalTicket(false)}
            style={{
              marginTop: 24,
              backgroundColor: "#2a2a2a",
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "500" }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
