import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  getCajasPorFecha,
  getVentasEnRango,
  getGastosEnRango,
} from "../../../src/services/ventas.service";
import { todayDate } from "../../../src/utils/dates";
import type { CajaDiaria } from "../../../src/db/schema";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

type CajaConResumen = CajaDiaria & {
  totalEfectivo: number;
  totalTransferencia: number;
  totalGastos: number;
  esperado: number;
  diferencia: number;
  esperadoTransferencia: number;
  diferenciaTransferencia: number;
};

export default function HistorialCajas() {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const router = useRouter();
  const [cajas, setCajas] = useState<CajaConResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(todayDate());
  const [showPicker, setShowPicker] = useState(false);
  type FiltroActivo = "hoy" | "ayer" | "otro";
  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("hoy");

  const cargarCajas = async (fecha: string) => {
    setCargando(true);
    try {
      const data = await getCajasPorFecha(fecha);
      const cerradas = data.filter((c) => c.cerrada_at !== null);
      const conResumen: CajaConResumen[] = [];

      for (const c of cerradas) {
        const hasta = c.cerrada_at!;
        const ventasCaja = await getVentasEnRango(c.created_at, hasta);
        let efec = 0;
        let trans = 0;
        for (const v of ventasCaja) {
          if (v.metodoPago === "efectivo") efec += v.total;
          else if (v.metodoPago === "transferencia") trans += v.total;
        }
        const gts = await getGastosEnRango(c.created_at, hasta);
        const esperado = c.montoInicial + efec - gts;
        const declarado = c.montoDeclaradoEfectivo ?? 0;
        const esperadoTransferencia = trans;
        const declaradoTransferencia = c.montoDeclaradoTransferencia ?? 0;
        conResumen.push({
          ...c,
          totalEfectivo: efec,
          totalTransferencia: trans,
          totalGastos: gts,
          esperado,
          diferencia: declarado - esperado,
          esperadoTransferencia,
          diferenciaTransferencia: declaradoTransferencia - esperadoTransferencia,
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
      cargarCajas(fechaSeleccionada);
    }, [fechaSeleccionada])
  );

  const seleccionarHoy = () => {
    setFiltroActivo("hoy");
    setFechaSeleccionada(todayDate());
    setShowPicker(false);
  };

  const seleccionarAyer = () => {
    setFiltroActivo("ayer");
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setFechaSeleccionada(d.toISOString().split("T")[0]);
    setShowPicker(false);
  };

  const seleccionarOtros = () => {
    setFiltroActivo("otro");
    setShowPicker(true);
  };

  const seleccionarFecha = (_: any, date?: Date) => {
    setShowPicker(Platform.OS === "ios");
    if (date) {
      setFechaSeleccionada(date.toISOString().split("T")[0]);
    }
  };

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

      {/* Selector de Fecha */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={seleccionarHoy}
          style={{
            backgroundColor: filtroActivo === "hoy" ? "#F97316" : colors.bgChip,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: filtroActivo === "hoy" ? "#fff" : colors.textLight, fontSize: 12, fontWeight: "500" }}>
            Hoy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={seleccionarAyer}
          style={{
            backgroundColor: filtroActivo === "ayer" ? "#F97316" : colors.bgChip,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: filtroActivo === "ayer" ? "#fff" : colors.textLight, fontSize: 12, fontWeight: "500" }}>
            Ayer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={seleccionarOtros}
          style={{
            backgroundColor: filtroActivo === "otro" ? "#F97316" : colors.bgChip,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: filtroActivo === "otro" ? "#fff" : colors.textLight, fontSize: 12, fontWeight: "500" }}>
            Otros
          </Text>
        </TouchableOpacity>
      </View>

      {filtroActivo === "otro" && showPicker && (
        <DateTimePicker
          value={new Date(fechaSeleccionada + "T12:00:00.000Z")}
          mode="date"
          display="default"
          onChange={seleccionarFecha}
        />
      )}

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
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Total Esperado Efectivo</Text>
                <Text style={{ color: "#F97316", fontSize: 14, fontWeight: "bold" }}>${c.esperado.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Efectivo Declarado</Text>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>${(c.montoDeclaradoEfectivo || 0).toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Total Esperado Transferencia</Text>
                <Text style={{ color: "#F97316", fontSize: 14, fontWeight: "bold" }}>${c.esperadoTransferencia.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Transferencia Declarado</Text>
                <Text style={{ color: "#38bdf8", fontSize: 13, fontWeight: "500" }}>
                  {c.montoDeclaradoTransferencia !== null && c.montoDeclaradoTransferencia !== undefined
                    ? `$${c.montoDeclaradoTransferencia.toFixed(2)}`
                    : "N/A"}
                </Text>
              </View>

              {/* Diferencias */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>Diferencia Efectivo</Text>
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

              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 4 }}>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>Diferencia Transferencia</Text>
                <Text
                  style={{
                    color: c.diferenciaTransferencia >= 0 ? "#22c55e" : "#ef4444",
                    fontSize: 14,
                    fontWeight: "bold",
                  }}
                >
                  {c.diferenciaTransferencia > 0 ? "+" : ""}{c.diferenciaTransferencia.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          {cajas.length === 0 && !cargando && (
            <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
              Caja no aperturada este día
            </Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
