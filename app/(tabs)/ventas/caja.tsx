import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  getCajaHoy,
  getCajaAbierta,
  abrirCaja,
  cerrarCaja,
  getHistorialVentas,
  getTotalGastosFecha,
} from "../../../src/services/ventas.service";
import { getPedidosPendientesCount } from "../../../src/services/pedidos.service";
import PinModal from "../../../src/components/shared/PinModal";
import type { CajaDiaria } from "../../../src/db/schema";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

export default function GestionCaja() {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const router = useRouter();

  const [caja, setCaja] = useState<CajaDiaria | null>(null);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);

  // Formularios
  const [montoInicial, setMontoInicial] = useState("");
  const [montoContado, setMontoContado] = useState("");
  
  // PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);

  const cargarDatos = async () => {
    try {
      // Intentar cargar caja abierta (aunque sea de otro día)
      let activeCaja = await getCajaAbierta();
      if (!activeCaja) {
        // Si no hay abierta, cargar la de hoy si ya existe
        activeCaja = await getCajaHoy();
      }
      setCaja(activeCaja);

      if (activeCaja) {
        // Cargar ventas del día de la caja
        const ventasDia = await getHistorialVentas(activeCaja.fecha);
        let efec = 0;
        let trans = 0;
        ventasDia.forEach((v) => {
          if (v.metodoPago === "efectivo") efec += v.total;
          else if (v.metodoPago === "transferencia") trans += v.total;
        });

        setTotalEfectivo(efec);
        setTotalTransferencia(trans);

        // Cargar gastos del día de la caja
        const gts = await getTotalGastosFecha(activeCaja.fecha);
        setTotalGastos(gts);
      } else {
        setTotalEfectivo(0);
        setTotalTransferencia(0);
        setTotalGastos(0);
      }
    } catch (error) {
      console.error("Error al cargar caja:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const handleAbrirCaja = async () => {
    if (!montoInicial || isNaN(Number(montoInicial.replace(",", ".")))) {
      Alert.alert("Error", "Ingresa un monto inicial válido.");
      return;
    }
    try {
      await abrirCaja(Number(montoInicial.replace(",", ".")));
      cargarDatos();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo abrir la caja.");
    }
  };

  const confirmarCierreCaja = async () => {
    if (!montoContado || isNaN(Number(montoContado.replace(",", ".")))) {
      Alert.alert("Error", "Ingresa el monto contado físico válido.");
      return;
    }

    try {
      // 1. Comprobar pedidos pendientes antes de cerrar
      const countPending = await getPedidosPendientesCount();
      if (countPending > 0) {
        Alert.alert(
          "Pedidos Pendientes",
          `Tienes ${countPending} pedido(s) pendiente(s) de entregar/cobrar. ¿Estás seguro de que deseas cerrar la caja con pedidos sin concluir?`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Cerrar de todos modos",
              style: "destructive",
              onPress: () => setShowPinModal(true),
            },
          ]
        );
      } else {
        setShowPinModal(true);
      }
    } catch (error) {
      console.error(error);
      setShowPinModal(true);
    }
  };

  const handlePinSuccess = async () => {
    setShowPinModal(false);
    if (!caja) return;
    try {
      await cerrarCaja(caja.id, Number(montoContado.replace(",", ".")));
      Alert.alert("Éxito", "La caja ha sido cerrada correctamente.");
      cargarDatos();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo cerrar la caja.");
    }
  };

  const esperadoEnCaja = (caja?.montoInicial || 0) + totalEfectivo - totalGastos;
  const contadoNum = Number(montoContado.replace(",", ".")) || 0;
  const diferencia = contadoNum - esperadoEnCaja;

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
          <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Caja Diaria</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {!caja ? (
          <View style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: colors.border, gap: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text, textAlign: "center", marginBottom: 8 }}>
              Abrir Caja
            </Text>
            
            <View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Monto inicial en efectivo</Text>
              <TextInput
                value={montoInicial}
                onChangeText={setMontoInicial}
                keyboardType="numeric"
                style={{
                  backgroundColor: colors.bgInput,
                  color: colors.text,
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 14,
                }}
                placeholderTextColor={colors.textMuted}
                placeholder="Ej. 1000"
              />
            </View>

            <TouchableOpacity
              onPress={handleAbrirCaja}
              style={{
                backgroundColor: "#F97316",
                padding: 14,
                borderRadius: 10,
                alignItems: "center",
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "500", fontSize: 14 }}>Abrir Caja</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Resumen de Caja */}
            <View style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: colors.border, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Resumen de Caja</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>Fecha de apertura: {caja.fecha}</Text>
                </View>
                {caja.cerrada_at && (
                  <View style={{ backgroundColor: isDark ? "#001a10" : "#e6f7e6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 10, color: "#22c55e", fontWeight: "bold" }}>CERRADA</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Monto inicial</Text>
                <Text style={{ color: colors.textLight, fontSize: 13 }}>${caja.montoInicial.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Ventas Efectivo</Text>
                <Text style={{ color: "#22c55e", fontSize: 13 }}>+ ${totalEfectivo.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Gastos del día (Efectivo)</Text>
                <Text style={{ color: "#ef4444", fontSize: 13 }}>- ${totalGastos.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: colors.border, paddingBottom: 8 }}>
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Ventas Transferencia</Text>
                <Text style={{ color: "#38bdf8", fontSize: 13 }}>${totalTransferencia.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8 }}>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>Total Esperado en Caja (Efectivo)</Text>
                <Text style={{ color: "#F97316", fontSize: 16, fontWeight: "bold" }}>${esperadoEnCaja.toFixed(2)}</Text>
              </View>
            </View>

            {/* Cierre de Caja */}
            {!caja.cerrada_at ? (
              <View style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: colors.border, gap: 16 }}>
                <View>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Monto Contado Físicamente</Text>
                  <TextInput
                    value={montoContado}
                    onChangeText={setMontoContado}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: colors.bgInput,
                      color: colors.text,
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                    placeholderTextColor={colors.textMuted}
                    placeholder="Ej. 1500"
                  />
                </View>

                {montoContado !== "" && !isNaN(Number(montoContado.replace(",", "."))) && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, backgroundColor: diferencia === 0 ? (isDark ? "#001a10" : "#e6f7e6") : (isDark ? "#2a1a1a" : "#ffe6e6"), borderRadius: 10, borderWidth: 0.5, borderColor: diferencia === 0 ? "#22c55e" : "#ef4444" }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>Diferencia</Text>
                    <Text style={{ color: diferencia === 0 ? "#22c55e" : "#ef4444", fontSize: 14, fontWeight: "bold" }}>
                      {diferencia > 0 ? "+" : ""}{diferencia.toFixed(2)}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={confirmarCierreCaja}
                  style={{
                    backgroundColor: "#ef4444",
                    padding: 14,
                    borderRadius: 10,
                    alignItems: "center",
                    marginTop: 8,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "500", fontSize: 14 }}>Cerrar Caja</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                <View style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: colors.border }}>
                  <Text style={{ color: colors.textMuted, textAlign: "center", marginBottom: 12 }}>
                    Caja cerrada a las {new Date(caja.cerrada_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, backgroundColor: colors.bgInput, borderRadius: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>Monto Declarado</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: "bold" }}>
                      ${(caja.montoDeclarado || 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setCaja(null)}
                  style={{
                    backgroundColor: "#F97316",
                    padding: 14,
                    borderRadius: 10,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Abrir Nueva Caja</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {showPinModal && (
        <PinModal
          visible={showPinModal}
          titulo="PIN para Cerrar Caja"
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinModal(false)}
        />
      )}
    </View>
  );
}
