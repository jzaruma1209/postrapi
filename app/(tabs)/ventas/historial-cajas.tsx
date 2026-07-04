import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  getHistorialCajas,
  getVentasEnRango,
  getGastosEnRango,
} from "../../../src/services/ventas.service";
import type { CajaDiaria } from "../../../src/db/schema";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

type CajaConResumen = CajaDiaria & {
  totalEfectivo: number;
  totalGastos: number;
  esperado: number;
  diferencia: number;
};

export default function HistorialCajas() {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const router = useRouter();
  const [cajas, setCajas] = useState<CajaConResumen[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargarCajas = async () => {
    setCargando(true);
    try {
      const data = await getHistorialCajas();
      const conResumen: CajaConResumen[] = [];

      for (const c of data) {
        const hasta = c.cerrada_at!;
        const ventasCaja = await getVentasEnRango(c.created_at, hasta);
        let efec = 0;
        for (const v of ventasCaja) {
          if (v.metodoPago === "efectivo") efec += v.total;
        }
        const gts = await getGastosEnRango(c.created_at, hasta);
        const esperado = c.montoInicial + efec - gts;
        const declarado = c.montoDeclarado ?? 0;
        conResumen.push({
          ...c,
          totalEfectivo: efec,
          totalGastos: gts,
          esperado,
          diferencia: declarado - esperado,
        });
      }

      setCajas(conResumen);
    } catch (error) {
      console.error("Error al cargar historial de cajas:", error);
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarCajas();
    }, [])
  );

  const formatFecha = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatHora = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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
          <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Historial de Cajas</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {cajas.map((c) => (
            <View
              key={c.id}
              style={{
                backgroundColor: colors.bgCard,
                borderRadius: 14,
                borderWidth: 0.5,
                borderColor: colors.border,
                borderLeftWidth: 3,
                borderLeftColor: "#F97316",
                padding: 16,
                gap: 8,
              }}
            >
              {/* Fechas */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Apertura: {formatFecha(c.created_at)} {formatHora(c.created_at)}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>
                  Cierre: {formatFecha(c.cerrada_at!)} {formatHora(c.cerrada_at!)}
                </Text>
              </View>

              {/* Montos */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Monto Inicial</Text>
                <Text style={{ color: colors.textLight, fontSize: 13 }}>${c.montoInicial.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Total Esperado</Text>
                <Text style={{ color: "#F97316", fontSize: 14, fontWeight: "bold" }}>${c.esperado.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Declarado</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>${(c.montoDeclarado || 0).toFixed(2)}</Text>
              </View>

              {/* Diferencia */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>Diferencia</Text>
                <Text
                  style={{
                    color: c.diferencia >= 0 ? "#22c55e" : "#ef4444",
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  {c.diferencia > 0 ? "+" : ""}{c.diferencia.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          {cajas.length === 0 && !cargando && (
            <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
              No hay cajas cerradas registradas.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
