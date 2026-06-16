import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  registrarGasto,
  getGastosHoy,
  getTotalGastosHoy,
} from "../../../src/services/inventario.service";
import PinModal from "../../../src/components/shared/PinModal";
import type { Gasto } from "../../../src/db/schema";
import type { CategoriaGasto } from "../../../src/utils/types";
import { todayDate } from "../../../src/utils/dates";

type FilterCategoria = "todos" | CategoriaGasto;

export default function GastosIndex() {
  const [gastosList, setGastosList] = useState<Gasto[]>([]);
  const [totalGastosHoy, setTotalGastosHoy] = useState(0);
  const [filtro, setFiltro] = useState<FilterCategoria>("todos");

  // PinModal state
  const [showPinModal, setShowPinModal] = useState(false);

  // Gasto: Registrar
  const [modalGasto, setModalGasto] = useState(false);
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [categoria, setCategoria] = useState<CategoriaGasto>("servicios");
  const [fechaGasto, setFechaGasto] = useState(todayDate());

  const cargarDatos = async () => {
    try {
      const gastosHoy = await getGastosHoy();
      setGastosList(gastosHoy);

      const totalHoy = await getTotalGastosHoy();
      setTotalGastosHoy(totalHoy);
    } catch (error) {
      console.error("Error cargando datos de gastos", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const getCategoriaStyle = (cat: CategoriaGasto) => {
    switch (cat) {
      case "servicios":
        return { bg: "#001a2a", text: "#38bdf8", label: "Servicios" };
      case "personal":
        return { bg: "#1a001a", text: "#c084fc", label: "Personal" };
      case "transporte":
        return { bg: "#001a10", text: "#22c55e", label: "Transporte" };
      case "otro":
        return { bg: "#1a1a1a", text: "#888", label: "Otro" };
      default:
        return { bg: "#1a1a1a", text: "#888", label: "Desconocido" };
    }
  };

  const gastosFiltrados = useMemo(() => {
    if (filtro === "todos") return gastosList;
    return gastosList.filter((g) => g.categoria === filtro);
  }, [gastosList, filtro]);

  const breakdown = useMemo(() => {
    const res: Record<CategoriaGasto, number> = {
      servicios: 0,
      personal: 0,
      transporte: 0,
      otro: 0,
    };
    gastosList.forEach((g) => {
      res[g.categoria] += g.monto;
    });
    return res;
  }, [gastosList]);

  // ─── HANDLERS DE FORMULARIOS ───
  const solicitarNuevoGasto = () => {
    setConcepto("");
    setMonto("");
    setCategoria("servicios");
    setFechaGasto(todayDate());
    setModalGasto(true);
  };

  const confirmarNuevoGasto = () => {
    if (!concepto.trim() || !monto || isNaN(Number(monto))) {
      Alert.alert("Error", "Concepto y Monto válido son obligatorios.");
      return;
    }
    // Ocultamos el modal de formulario para dar paso al PIN (o lo mantenemos por debajo)
    setShowPinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowPinModal(false);
    try {
      await registrarGasto({
        concepto,
        monto: Number(monto),
        categoria,
        fecha: fechaGasto,
      });
      setModalGasto(false);
      Alert.alert("Éxito", "Gasto registrado correctamente");
      cargarDatos();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Ocurrió un error al registrar el gasto");
    }
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
        <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>Gastos</Text>
        <TouchableOpacity onPress={solicitarNuevoGasto} style={{ backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>+ Gasto</Text>
        </TouchableOpacity>
      </View>

      {/* Chips de filtro por categoría */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(["todos", "servicios", "personal", "transporte", "otro"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setFiltro(cat as FilterCategoria)}
              style={{
                backgroundColor: filtro === cat ? "#F97316" : "#2a2a2a",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: filtro === cat ? "#fff" : "#ccc", fontSize: 13, fontWeight: filtro === cat ? "500" : "400", textTransform: "capitalize" }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Resumen del día */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={{ backgroundColor: "#1e1e1e", padding: 20, borderRadius: 14, borderWidth: 0.5, borderColor: "#2a2a2a" }}>
          <Text style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>Total gastos hoy</Text>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>
            ${totalGastosHoy.toFixed(2)}
          </Text>
          {gastosList.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {breakdown.servicios > 0 && <Text style={{ color: "#38bdf8", fontSize: 12 }}>Servicios ${breakdown.servicios.toFixed(2)} ·</Text>}
              {breakdown.personal > 0 && <Text style={{ color: "#c084fc", fontSize: 12 }}>Personal ${breakdown.personal.toFixed(2)} ·</Text>}
              {breakdown.transporte > 0 && <Text style={{ color: "#22c55e", fontSize: 12 }}>Transporte ${breakdown.transporte.toFixed(2)} ·</Text>}
              {breakdown.otro > 0 && <Text style={{ color: "#888", fontSize: 12 }}>Otro ${breakdown.otro.toFixed(2)}</Text>}
            </View>
          ) : (
            <Text style={{ color: "#555", fontSize: 12 }}>Sin desglose</Text>
          )}
        </View>
      </View>

      {/* Lista de gastos del día */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {gastosFiltrados.map((gasto) => {
          const catStyle = getCategoriaStyle(gasto.categoria);
          return (
            <View key={gasto.id} style={{ backgroundColor: "#1e1e1e", borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: "#2a2a2a", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "500", marginBottom: 6 }}>{gasto.concepto}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ backgroundColor: catStyle.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: catStyle.text, fontSize: 11, fontWeight: "500" }}>{catStyle.label}</Text>
                  </View>
                  <Text style={{ color: "#666", fontSize: 11 }}>
                    {new Date(gasto.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
              <Text style={{ color: "#ef4444", fontSize: 16, fontWeight: "bold" }}>
                ${gasto.monto.toFixed(2)}
              </Text>
            </View>
          );
        })}
        {gastosFiltrados.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Feather name="inbox" size={32} color="#444" style={{ marginBottom: 12 }} />
            <Text style={{ color: "#888", fontSize: 14 }}>Sin gastos registrados hoy</Text>
          </View>
        )}
      </ScrollView>

      {/* MODAL: Registrar Gasto */}
      <Modal visible={modalGasto} transparent animationType="slide" onRequestClose={() => setModalGasto(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#1e1e1e", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: "#fff", marginBottom: 16 }}>Registrar gasto</Text>
            
            <View style={{ gap: 12, marginBottom: 24 }}>
              <View>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Concepto</Text>
                <TextInput
                  value={concepto}
                  onChangeText={setConcepto}
                  placeholder="ej: Pago luz agosto"
                  placeholderTextColor="#666"
                  style={{ backgroundColor: "#2a2a2a", color: "#fff", padding: 12, borderRadius: 10 }}
                />
              </View>

              <View>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Monto ($)</Text>
                <TextInput
                  value={monto}
                  onChangeText={setMonto}
                  keyboardType="numeric"
                  placeholder="Ej: 50.00"
                  placeholderTextColor="#666"
                  style={{ backgroundColor: "#2a2a2a", color: "#fff", padding: 12, borderRadius: 10 }}
                />
              </View>

              <View>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Categoría</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(["servicios", "personal", "transporte", "otro"] as CategoriaGasto[]).map((cat) => {
                    const catStyle = getCategoriaStyle(cat);
                    const isActive = categoria === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategoria(cat)}
                        style={{
                          backgroundColor: isActive ? catStyle.bg : "#2a2a2a",
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isActive ? catStyle.text : "transparent",
                        }}
                      >
                        <Text style={{ color: isActive ? catStyle.text : "#ccc", fontSize: 13, fontWeight: "500" }}>{catStyle.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setModalGasto(false)} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#555", alignItems: "center" }}>
                <Text style={{ color: "#ccc", fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarNuevoGasto} style={{ flex: 1, backgroundColor: "#F97316", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "500" }}>Registrar gasto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN MODAL GLOBAL PARA GASTOS */}
      {showPinModal && (
        <PinModal
          visible={showPinModal}
          titulo="Autorización de Gasto"
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinModal(false)}
        />
      )}
    </View>
  );
}
