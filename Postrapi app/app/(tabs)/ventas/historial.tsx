import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "../../../src/db";
import { ventas, ventaItems } from "../../../src/db/schema";
import { fechaLocal, inicioDia, finDia, todayDate } from "../../../src/utils/dates";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

type VentaHistorial = {
  id: string;
  total: number;
  metodoPago: string;
  created_at: string;
  itemsCount: number;
  pedidoId: string | null;
  descuentoTipo: string | null;
  descuentoValor: number | null;
  numero: number;
};

export default function HistorialVentas() {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
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
          created_at: ventas.created_at,
          itemsCount: sql<number>`count(${ventaItems.id})`,
          pedidoId: ventas.pedidoId,
          descuentoTipo: ventas.descuentoTipo,
          descuentoValor: ventas.descuentoValor,
        })
        .from(ventas)
        .leftJoin(ventaItems, eq(ventas.id, ventaItems.ventaId))
        .where(
          and(
            gte(ventas.created_at, inicioDia(dateStr)),
            lte(ventas.created_at, finDia(dateStr))
          )
        )
        .groupBy(ventas.id)
        .orderBy(ventas.created_at);

      const conNumero = data.map((v, idx) => ({ ...v, numero: idx + 1 }));
      setListaVentas(conNumero.reverse());
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
    setFecha(fechaLocal(d));
  };

  const setFechaHoy = () => {
    setFecha(todayDate());
  };

  const formatHora = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 16,
          backgroundColor: colors.bg,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="arrow-left" size={20} color={colors.text} />
          <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Historial de Ventas</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de Fecha */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={setFechaHoy}
          style={{
            backgroundColor: fecha === todayDate() ? "#F97316" : colors.bgChip,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: fecha === todayDate() ? "#fff" : colors.textLight, fontSize: 12, fontWeight: "500" }}>Hoy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={setFechaAyer}
          style={{
            backgroundColor: fecha !== todayDate() ? "#F97316" : colors.bgChip,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: fecha !== todayDate() ? "#fff" : colors.textLight, fontSize: 12, fontWeight: "500" }}>Ayer</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {listaVentas.map((v) => (
          <TouchableOpacity
            key={v.id}
            activeOpacity={0.7}
            onPress={() => router.push(`/ventas/${v.id}` as any)}
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: colors.border,
              borderLeftWidth: 3,
              borderLeftColor: v.metodoPago === "efectivo" ? "#22c55e" : "#38bdf8",
              padding: 16,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ fontSize: 14, color: colors.text, fontWeight: "500", marginBottom: 4 }}>
                {formatHora(v.created_at)}  <Text style={{ fontSize: 11, color: colors.textMuted }}>Venta #{v.numero}</Text>
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                {v.itemsCount} {v.itemsCount === 1 ? "item" : "items"}
              </Text>
            </View>

            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 16, color: "#F97316", fontWeight: "bold" }}>
                  ${v.total.toFixed(2)}
                </Text>
                {v.descuentoTipo != null && v.descuentoValor != null && v.descuentoValor > 0 && (
                  <Feather name="tag" size={14} color="#ef4444" />
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <View
                  style={{
                    backgroundColor: v.metodoPago === "efectivo" ? (isDark ? "#001a10" : "#e6f7e6") : (isDark ? "#001a2a" : "#e6f4ff"),
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "500", color: v.metodoPago === "efectivo" ? "#22c55e" : "#38bdf8" }}>
                    {v.metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: isDark ? "#1a1a2e" : "#f0f0f5",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: "500", color: colors.textMuted }}>
                    {v.pedidoId ? "Pedido" : "Directa"}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        {listaVentas.length === 0 && (
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
            No hay ventas registradas para esta fecha.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
