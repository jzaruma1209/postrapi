import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { db } from "../../../src/db";
import { ventas, ventaItems } from "../../../src/db/schema";
import { todayDate } from "../../../src/utils/dates";

type VentaHistorial = {
  id: string;
  total: number;
  metodoPago: string;
  createdAt: string;
  itemsCount: number;
};

export default function HistorialVentas() {
  const router = useRouter();
  const [listaVentas, setListaVentas] = useState<VentaHistorial[]>([]);
  const [fecha, setFecha] = useState<string>(todayDate());

  const cargarVentas = async (dateStr: string) => {
    try {
      const data = await db
        .select({
          id: ventas.id,
          total: ventas.total,
          metodoPago: ventas.metodoPago,
          createdAt: ventas.createdAt,
          itemsCount: sql<number>`count(${ventaItems.id})`,
        })
        .from(ventas)
        .leftJoin(ventaItems, eq(ventas.id, ventaItems.ventaId))
        .where(
          and(
            gte(ventas.createdAt, `${dateStr}T00:00:00.000Z`),
            lte(ventas.createdAt, `${dateStr}T23:59:59.999Z`)
          )
        )
        .groupBy(ventas.id)
        .orderBy(desc(ventas.createdAt));

      setListaVentas(data);
    } catch (error) {
      console.error("Error al cargar historial:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarVentas(fecha);
    }, [fecha])
  );

  const setFechaAyer = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setFecha(d.toISOString().split("T")[0]);
  };

  const setFechaHoy = () => {
    setFecha(todayDate());
  };

  const formatHora = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#141414" }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 16,
          backgroundColor: "#141414",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="arrow-left" size={20} color="#fff" />
          <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>Historial de Ventas</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de Fecha */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={setFechaHoy}
          style={{
            backgroundColor: fecha === todayDate() ? "#F97316" : "#2a2a2a",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: fecha === todayDate() ? "#fff" : "#ccc", fontSize: 12, fontWeight: "500" }}>Hoy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={setFechaAyer}
          style={{
            backgroundColor: fecha !== todayDate() ? "#F97316" : "#2a2a2a",
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: fecha !== todayDate() ? "#fff" : "#ccc", fontSize: 12, fontWeight: "500" }}>Ayer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {listaVentas.map((v) => (
          <TouchableOpacity
            key={v.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/ventas/${v.id}` as any)}
            style={{
              backgroundColor: "#1e1e1e",
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: "#2a2a2a",
              borderLeftWidth: 3,
              borderLeftColor: v.metodoPago === "efectivo" ? "#22c55e" : "#38bdf8",
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ fontSize: 14, color: "#fff", fontWeight: "500", marginBottom: 4 }}>
                {formatHora(v.createdAt)}
              </Text>
              <Text style={{ fontSize: 11, color: "#888" }}>
                {v.itemsCount} {v.itemsCount === 1 ? "item" : "items"}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ fontSize: 16, color: "#F97316", fontWeight: "bold" }}>
                ${v.total.toFixed(2)}
              </Text>
              <View
                style={{
                  backgroundColor: v.metodoPago === "efectivo" ? "#001a10" : "#001a2a",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "500", color: v.metodoPago === "efectivo" ? "#22c55e" : "#38bdf8" }}>
                  {v.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {listaVentas.length === 0 && (
          <Text style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
            No hay ventas registradas para esta fecha.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
