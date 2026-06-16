import { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  getCajaHoy,
  abrirCaja,
  cerrarCaja,
  getVentasHoy,
} from "../../../src/services/ventas.service";
import PinModal from "../../../src/components/shared/PinModal";
import type { CajaDiaria } from "../../../src/db/schema";

export default function GestionCaja() {
  const router = useRouter();

  const [caja, setCaja] = useState<CajaDiaria | null>(null);
  const [totalEfectivo, setTotalEfectivo] = useState(0);
  const [totalTransferencia, setTotalTransferencia] = useState(0);

  // Formularios
  const [montoInicial, setMontoInicial] = useState("");
  const [montoContado, setMontoContado] = useState("");
  
  // PIN Modal
  const [showPinModal, setShowPinModal] = useState(false);

  const cargarDatos = async () => {
    try {
      const cajaHoy = await getCajaHoy();
      setCaja(cajaHoy);

      const ventas = await getVentasHoy();
      let efec = 0;
      let trans = 0;
      ventas.forEach((v) => {
        if (v.metodoPago === "efectivo") efec += v.total;
        else if (v.metodoPago === "transferencia") trans += v.total;
      });

      setTotalEfectivo(efec);
      setTotalTransferencia(trans);
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
    if (!montoInicial || isNaN(Number(montoInicial))) {
      Alert.alert("Error", "Ingresa un monto inicial válido.");
      return;
    }
    try {
      await abrirCaja(Number(montoInicial));
      cargarDatos();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo abrir la caja.");
    }
  };

  const confirmarCierreCaja = () => {
    if (!montoContado || isNaN(Number(montoContado))) {
      Alert.alert("Error", "Ingresa el monto contado físico válido.");
      return;
    }
    setShowPinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowPinModal(false);
    if (!caja) return;
    try {
      await cerrarCaja(caja.id, Number(montoContado));
      Alert.alert("Éxito", "La caja ha sido cerrada correctamente.");
      cargarDatos();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo cerrar la caja.");
    }
  };

  const esperadoEnCaja = (caja?.montoInicial || 0) + totalEfectivo;
  const contadoNum = Number(montoContado) || 0;
  const diferencia = contadoNum - esperadoEnCaja;

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
          <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>Caja Diaria</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {!caja ? (
          <View style={{ backgroundColor: "#1e1e1e", borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: "#2a2a2a", gap: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: "#fff", textAlign: "center", marginBottom: 8 }}>
              Abrir Caja
            </Text>
            
            <View>
              <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Monto inicial en efectivo</Text>
              <TextInput
                value={montoInicial}
                onChangeText={setMontoInicial}
                keyboardType="numeric"
                style={{
                  backgroundColor: "#2a2a2a",
                  color: "#fff",
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 14,
                }}
                placeholderTextColor="#666"
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
            <View style={{ backgroundColor: "#1e1e1e", borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: "#2a2a2a", gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: "500", color: "#fff" }}>Resumen</Text>
                {caja.cerradaAt && (
                  <View style={{ backgroundColor: "#001a10", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 10, color: "#22c55e", fontWeight: "bold" }}>CERRADA</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: "#333", paddingBottom: 8 }}>
                <Text style={{ color: "#888", fontSize: 13 }}>Monto inicial</Text>
                <Text style={{ color: "#ccc", fontSize: 13 }}>${caja.montoInicial.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: "#333", paddingBottom: 8 }}>
                <Text style={{ color: "#888", fontSize: 13 }}>Ventas Efectivo</Text>
                <Text style={{ color: "#22c55e", fontSize: 13 }}>+ ${totalEfectivo.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 0.5, borderBottomColor: "#333", paddingBottom: 8 }}>
                <Text style={{ color: "#888", fontSize: 13 }}>Ventas Transferencia</Text>
                <Text style={{ color: "#38bdf8", fontSize: 13 }}>${totalTransferencia.toFixed(2)}</Text>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 8 }}>
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>Total Esperado en Caja</Text>
                <Text style={{ color: "#F97316", fontSize: 16, fontWeight: "bold" }}>${esperadoEnCaja.toFixed(2)}</Text>
              </View>
            </View>

            {/* Cierre de Caja */}
            {!caja.cerradaAt ? (
              <View style={{ backgroundColor: "#1e1e1e", borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: "#2a2a2a", gap: 16 }}>
                <View>
                  <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Monto Contado Físicamente</Text>
                  <TextInput
                    value={montoContado}
                    onChangeText={setMontoContado}
                    keyboardType="numeric"
                    style={{
                      backgroundColor: "#2a2a2a",
                      color: "#fff",
                      borderRadius: 10,
                      padding: 12,
                      fontSize: 16,
                      fontWeight: "bold",
                    }}
                    placeholderTextColor="#666"
                    placeholder="Ej. 1500"
                  />
                </View>

                {montoContado !== "" && !isNaN(Number(montoContado)) && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, backgroundColor: diferencia === 0 ? "#001a10" : "#2a1a1a", borderRadius: 10, borderWidth: 0.5, borderColor: diferencia === 0 ? "#22c55e" : "#ef4444" }}>
                    <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>Diferencia</Text>
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
              <View style={{ backgroundColor: "#1e1e1e", borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: "#2a2a2a" }}>
                <Text style={{ color: "#888", textAlign: "center", marginBottom: 12 }}>
                  Caja cerrada a las {new Date(caja.cerradaAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 12, backgroundColor: "#2a2a2a", borderRadius: 10 }}>
                  <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>Monto Declarado</Text>
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold" }}>
                    ${(caja.montoDeclarado || 0).toFixed(2)}
                  </Text>
                </View>
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
