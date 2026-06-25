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
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

type FilterCategoria = "todos" | CategoriaGasto;

export default function GastosIndex() {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);

  const [gastosList, setGastosList] = useState<Gasto[]>([]);
  const [totalGastosHoy, setTotalGastosHoy] = useState(0);
  const [filtro, setFiltro] = useState<FilterCategoria>("todos");

  const [showPinModal, setShowPinModal] = useState(false);
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
        return { bg: isDark ? "#001a2a" : "#e0f2fe", text: "#38bdf8", label: "Servicios" };
      case "personal":
        return { bg: isDark ? "#1a001a" : "#f3e8ff", text: "#c084fc", label: "Personal" };
      case "transporte":
        return { bg: isDark ? "#001a10" : "#dcfce7", text: "#22c55e", label: "Transporte" };
      case "otro":
        return { bg: isDark ? "#1a1a1a" : "#f0f0f0", text: isDark ? "#888" : "#666", label: "Otro" };
      default:
        return { bg: colors.bgInput, text: colors.textMuted, label: "Desconocido" };
    }
  };

  const gastosFiltrados = useMemo(() => {
    if (filtro === "todos") return gastosList;
    return gastosList.filter((g) => g.categoria === filtro);
  }, [gastosList, filtro]);

  const breakdown = useMemo(() => {
    const res: Record<CategoriaGasto, number> = { servicios: 0, personal: 0, transporte: 0, otro: 0 };
    gastosList.forEach((g) => { res[g.categoria] += g.monto; });
    return res;
  }, [gastosList]);

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
    setShowPinModal(true);
  };

  const handlePinSuccess = async () => {
    setShowPinModal(false);
    try {
      await registrarGasto({ concepto, monto: Number(monto), categoria, fecha: fechaGasto });
      setModalGasto(false);
      Alert.alert("Éxito", "Gasto registrado correctamente");
      cargarDatos();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Ocurrió un error al registrar el gasto");
    }
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
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>Gastos</Text>
        <TouchableOpacity onPress={solicitarNuevoGasto} style={{ backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>+ Gasto</Text>
        </TouchableOpacity>
      </View>

      {/* Chips de filtro */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(["todos", "servicios", "personal", "transporte", "otro"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setFiltro(cat as FilterCategoria)}
              style={{
                backgroundColor: filtro === cat ? "#F97316" : colors.bgChip,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: filtro === cat ? "#F97316" : colors.border,
              }}
            >
              <Text style={{ color: filtro === cat ? "#fff" : colors.textMuted, fontSize: 12, fontWeight: filtro === cat ? "600" : "400", textTransform: "capitalize" }}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Resumen del día */}
      <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={{ backgroundColor: colors.bgCard, padding: 20, borderRadius: 14, borderWidth: isDark ? 0.5 : 1, borderColor: colors.border }}>
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 4 }}>Total gastos hoy</Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>
            ${totalGastosHoy.toFixed(2)}
          </Text>
          {gastosList.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {breakdown.servicios > 0 && <Text style={{ color: "#38bdf8", fontSize: 12 }}>Servicios ${breakdown.servicios.toFixed(2)} ·</Text>}
              {breakdown.personal > 0 && <Text style={{ color: "#c084fc", fontSize: 12 }}>Personal ${breakdown.personal.toFixed(2)} ·</Text>}
              {breakdown.transporte > 0 && <Text style={{ color: "#22c55e", fontSize: 12 }}>Transporte ${breakdown.transporte.toFixed(2)} ·</Text>}
              {breakdown.otro > 0 && <Text style={{ color: colors.textMuted, fontSize: 12 }}>Otro ${breakdown.otro.toFixed(2)}</Text>}
            </View>
          ) : (
            <Text style={{ color: colors.tabInactive, fontSize: 12 }}>Sin desglose</Text>
          )}
        </View>
      </View>

      {/* Lista de gastos */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {gastosFiltrados.map((gasto) => {
          const catStyle = getCategoriaStyle(gasto.categoria);
          return (
            <View key={gasto.id} style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, borderWidth: isDark ? 0.5 : 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 6 }}>{gasto.concepto}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ backgroundColor: catStyle.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                    <Text style={{ color: catStyle.text, fontSize: 11, fontWeight: "600" }}>{catStyle.label}</Text>
                  </View>
                  <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                    {new Date(gasto.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
            <Feather name="inbox" size={32} color={colors.tabInactive} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>Sin gastos registrados hoy</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Registrar Gasto */}
      <Modal visible={modalGasto} transparent animationType="slide" onRequestClose={() => setModalGasto(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.bgInput, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 16 }}>Registrar gasto</Text>

            <View style={{ gap: 12, marginBottom: 24 }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Concepto</Text>
                <TextInput
                  value={concepto}
                  onChangeText={setConcepto}
                  placeholder="ej: Pago luz agosto"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 12, borderRadius: 10, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Monto ($)</Text>
                <TextInput
                  value={monto}
                  onChangeText={setMonto}
                  keyboardType="numeric"
                  placeholder="Ej: 50.00"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 12, borderRadius: 10, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Categoría</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {(["servicios", "personal", "transporte", "otro"] as CategoriaGasto[]).map((cat) => {
                    const catStyle = getCategoriaStyle(cat);
                    const isActive = categoria === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setCategoria(cat)}
                        style={{
                          backgroundColor: isActive ? catStyle.bg : colors.bgInput,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isActive ? catStyle.text : colors.border,
                        }}
                      >
                        <Text style={{ color: isActive ? catStyle.text : colors.textMuted, fontSize: 13, fontWeight: "500" }}>{catStyle.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setModalGasto(false)} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarNuevoGasto} style={{ flex: 1, backgroundColor: "#F97316", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Registrar gasto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
