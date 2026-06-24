import { useState, useCallback } from "react";
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
  getIngredientes,
  crearIngrediente,
  editarIngrediente,
  ajustarStock,
  registrarCompra,
  getCompras,
  getTotalComprasHoy,
} from "../../../src/services/inventario.service";
import PinModal from "../../../src/components/shared/PinModal";
import type { Ingrediente, Compra } from "../../../src/db/schema";
import { todayDate } from "../../../src/utils/dates";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

type TabBodega = "inventario" | "compras" | "ingredientes";
type PinAction = "ajustar" | "registrar_compra" | "guardar_ingrediente" | null;

export default function BodegaIndex() {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);

  const [tabActual, setTabActual] = useState<TabBodega>("inventario");
  const [ingredientesList, setIngredientesList] = useState<Ingrediente[]>([]);
  const [comprasList, setComprasList] = useState<Compra[]>([]);
  const [totalComprasHoy, setTotalComprasHoy] = useState(0);

  // PinModal state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinAction, setPinAction] = useState<PinAction>(null);

  // Inventario: Ajuste
  const [modalAjuste, setModalAjuste] = useState(false);
  const [ingAjuste, setIngAjuste] = useState<Ingrediente | null>(null);
  const [stockReal, setStockReal] = useState("");
  const [motivoAjuste, setMotivoAjuste] = useState("");

  // Compras: Registrar
  const [modalCompra, setModalCompra] = useState(false);
  const [ingCompraId, setIngCompraId] = useState("");
  const [cantidadCompra, setCantidadCompra] = useState("");
  const [costoCompra, setCostoCompra] = useState("");
  const [fechaCompra, setFechaCompra] = useState(todayDate());

  // Ingredientes: Crear/Editar
  const [modalIng, setModalIng] = useState(false);
  const [ingEditId, setIngEditId] = useState<string | null>(null);
  const [ingNombre, setIngNombre] = useState("");
  const [ingUnidad, setIngUnidad] = useState("kg");
  const [ingMinimo, setIngMinimo] = useState("");

  const cargarDatos = async () => {
    try {
      const ings = await getIngredientes();
      setIngredientesList(ings);

      const comps = await getCompras();
      setComprasList(comps);

      const totalComps = await getTotalComprasHoy();
      setTotalComprasHoy(totalComps);
    } catch (error) {
      console.error("Error cargando datos de bodega", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  // ─── PIN ACTION HANDLER ───
  const handlePinSuccess = async () => {
    setShowPinModal(false);
    try {
      if (pinAction === "ajustar") {
        if (!ingAjuste) return;
        await ajustarStock({
          ingredienteId: ingAjuste.id,
          stockReal: Number(stockReal),
          motivo: motivoAjuste,
        });
        setModalAjuste(false);
        Alert.alert("Éxito", "Stock ajustado correctamente");
      } else if (pinAction === "registrar_compra") {
        await registrarCompra({
          ingredienteId: ingCompraId,
          cantidad: Number(cantidadCompra),
          costoTotal: Number(costoCompra),
          fecha: fechaCompra,
        });
        setModalCompra(false);
        Alert.alert("Éxito", "Compra registrada correctamente");
      } else if (pinAction === "guardar_ingrediente") {
        if (ingEditId) {
          await editarIngrediente(ingEditId, {
            nombre: ingNombre,
            unidad: ingUnidad,
            stockMinimo: Number(ingMinimo),
          });
        } else {
          await crearIngrediente({
            nombre: ingNombre,
            unidad: ingUnidad,
            stockMinimo: Number(ingMinimo),
          });
        }
        setModalIng(false);
        Alert.alert("Éxito", "Ingrediente guardado correctamente");
      }
      cargarDatos();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Ocurrió un error en la operación");
    } finally {
      setPinAction(null);
    }
  };

  // ─── HANDLERS DE FORMULARIOS ───
  const solicitarAjuste = (ing: Ingrediente) => {
    setIngAjuste(ing);
    setStockReal(ing.stockActual.toString());
    setMotivoAjuste("");
    setModalAjuste(true);
  };

  const confirmarAjuste = () => {
    if (!stockReal || isNaN(Number(stockReal)) || !motivoAjuste) {
      Alert.alert("Error", "Ingresa un stock real válido y un motivo.");
      return;
    }
    setPinAction("ajustar");
    setShowPinModal(true);
  };

  const solicitarCompra = () => {
    setIngCompraId(ingredientesList[0]?.id || "");
    setCantidadCompra("");
    setCostoCompra("");
    setFechaCompra(todayDate());
    setModalCompra(true);
  };

  const confirmarCompra = () => {
    if (!ingCompraId || !cantidadCompra || !costoCompra) {
      Alert.alert("Error", "Todos los campos son obligatorios.");
      return;
    }
    setPinAction("registrar_compra");
    setShowPinModal(true);
  };

  const solicitarNuevoIngrediente = () => {
    setIngEditId(null);
    setIngNombre("");
    setIngUnidad("kg");
    setIngMinimo("");
    setModalIng(true);
  };

  const solicitarEditarIngrediente = (ing: Ingrediente) => {
    setIngEditId(ing.id);
    setIngNombre(ing.nombre);
    setIngUnidad(ing.unidad);
    setIngMinimo(ing.stockMinimo.toString());
    setModalIng(true);
  };

  const confirmarIngrediente = () => {
    if (!ingNombre || !ingMinimo) {
      Alert.alert("Error", "Nombre y Stock Mínimo son obligatorios.");
      return;
    }
    setPinAction("guardar_ingrediente");
    setShowPinModal(true);
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
        <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>Bodega</Text>
        <TouchableOpacity>
          <Feather name="settings" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Chips Navegación Interna */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["inventario", "compras", "ingredientes"] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setTabActual(tab)}
              style={{
                flex: 1,
                alignItems: "center",
                backgroundColor: tabActual === tab ? "#F97316" : colors.bgChip,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: tabActual === tab ? "#F97316" : colors.border,
              }}
            >
              <Text style={{ color: tabActual === tab ? "#fff" : colors.textMuted, fontSize: 12, fontWeight: tabActual === tab ? "600" : "500", textTransform: "capitalize" }}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ─── VISTA: INVENTARIO ─── */}
      {tabActual === "inventario" && (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
            {ingredientesList.map(ing => {
              const maxVisual = ing.stockMinimo * 3;
              const porcentaje = maxVisual > 0 ? Math.min((ing.stockActual / maxVisual) * 100, 100) : 0;
              const isBajo = ing.stockActual <= ing.stockMinimo;

              return (
                <TouchableOpacity
                  key={ing.id}
                  onPress={() => solicitarAjuste(ing)}
                  style={{
                    backgroundColor: colors.bgCard,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: isDark ? 0.5 : 1,
                    borderColor: isBajo ? "#ef4444" : colors.border,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{ing.nombre}</Text>
                      {isBajo && <Feather name="alert-triangle" size={14} color="#ef4444" />}
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.bgInput, borderRadius: 3, overflow: "hidden", width: "80%" }}>
                      <View style={{ height: "100%", width: `${porcentaje}%`, backgroundColor: isBajo ? "#ef4444" : "#22c55e" }} />
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: isBajo ? "#ef4444" : colors.text, fontSize: 16, fontWeight: "bold" }}>
                      {ing.stockActual.toFixed(2)}
                    </Text>
                    <Text style={{ color: colors.textMuted, fontSize: 11 }}>{ing.unidad}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {ingredientesList.length === 0 && (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>No hay ingredientes en el inventario.</Text>
              </View>
            )}
          </ScrollView>

          {/* Aviso fijo */}
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: isDark ? "#1a1a00" : "#fff4e6", borderTopWidth: 1, borderTopColor: isDark ? "#332b00" : "#fed7aa", padding: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Feather name="lock" size={14} color="#ea580c" />
            <Text style={{ color: "#ea580c", fontSize: 12, fontWeight: "500" }}>El ajuste de stock requiere PIN de supervisor</Text>
          </View>
        </>
      )}

      {/* ─── VISTA: COMPRAS ─── */}
      {tabActual === "compras" && (
        <>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12, alignItems: "flex-end" }}>
            <TouchableOpacity onPress={solicitarCompra} style={{ backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>+ Registrar compra</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {comprasList.map(comp => {
              const ing = ingredientesList.find(i => i.id === comp.ingredienteId);
              return (
                <View key={comp.id} style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, borderWidth: isDark ? 0.5 : 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between" }}>
                  <View>
                    <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 4 }}>{ing?.nombre || "Desconocido"}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      +{comp.cantidad} {ing?.unidad} · {new Date(comp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={{ color: "#22c55e", fontSize: 16, fontWeight: "bold" }}>
                    ${comp.costoTotal.toFixed(2)}
                  </Text>
                </View>
              );
            })}
            {comprasList.length === 0 && (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>No hay compras registradas hoy.</Text>
              </View>
            )}
          </ScrollView>

          <View style={{ padding: 16, backgroundColor: colors.bgCard, borderTopWidth: isDark ? 0.5 : 1, borderTopColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>Total compras hoy</Text>
            <Text style={{ color: "#F97316", fontSize: 18, fontWeight: "bold" }}>${totalComprasHoy.toFixed(2)}</Text>
          </View>
        </>
      )}

      {/* ─── VISTA: INGREDIENTES ─── */}
      {tabActual === "ingredientes" && (
        <>
          <View style={{ paddingHorizontal: 16, paddingBottom: 12, alignItems: "flex-end" }}>
            <TouchableOpacity onPress={solicitarNuevoIngrediente} style={{ backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}>
              <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>+ Nuevo ingrediente</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {ingredientesList.map(ing => (
              <TouchableOpacity
                key={ing.id}
                onPress={() => solicitarEditarIngrediente(ing)}
                style={{ backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, borderWidth: isDark ? 0.5 : 1, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
              >
                <View>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", marginBottom: 4 }}>{ing.nombre}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>Unidad: {ing.unidad}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: colors.textLight, fontSize: 12 }}>Min: {ing.stockMinimo}</Text>
                  <Feather name="chevron-right" size={16} color={colors.tabInactive} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            ))}
            {ingredientesList.length === 0 && (
              <View style={{ alignItems: "center", marginTop: 40 }}>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>No hay ingredientes registrados.</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* ─── MODALES ─── */}

      {/* Ajuste Stock */}
      <Modal visible={modalAjuste} transparent animationType="slide" onRequestClose={() => setModalAjuste(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.bgInput, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 16 }}>Ajustar stock — {ingAjuste?.nombre}</Text>
            
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 20, backgroundColor: colors.bgInput, padding: 16, borderRadius: 12, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "500" }}>Stock actual en sistema</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "bold" }}>{ingAjuste?.stockActual.toFixed(2)} {ingAjuste?.unidad}</Text>
            </View>

            <View style={{ gap: 16, marginBottom: 24 }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "500" }}>Stock real contado</Text>
                <TextInput
                  value={stockReal}
                  onChangeText={setStockReal}
                  keyboardType="numeric"
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 14, borderRadius: 10, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "500" }}>Motivo (obligatorio)</Text>
                <TextInput
                  value={motivoAjuste}
                  onChangeText={setMotivoAjuste}
                  placeholder="Ej: Merma, Conteo físico"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 14, borderRadius: 10, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setModalAjuste(false)} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarAjuste} style={{ flex: 1, backgroundColor: "#F97316", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Guardar ajuste</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Registro de Compra */}
      <Modal visible={modalCompra} transparent animationType="slide" onRequestClose={() => setModalCompra(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.bgInput, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 16 }}>Registrar compra</Text>
            
            <View style={{ gap: 16, marginBottom: 24 }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "500" }}>Ingrediente</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {ingredientesList.map(ing => (
                    <TouchableOpacity
                      key={ing.id}
                      onPress={() => setIngCompraId(ing.id)}
                      style={{ backgroundColor: ingCompraId === ing.id ? "#F97316" : colors.bgChip, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: ingCompraId === ing.id ? "#F97316" : colors.border }}
                    >
                      <Text style={{ color: ingCompraId === ing.id ? "#fff" : colors.textMuted, fontSize: 13, fontWeight: ingCompraId === ing.id ? "600" : "500" }}>{ing.nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "500" }}>
                  Cantidad entrante ({ingredientesList.find(i => i.id === ingCompraId)?.unidad || "-"})
                </Text>
                <TextInput
                  value={cantidadCompra}
                  onChangeText={setCantidadCompra}
                  keyboardType="numeric"
                  placeholder="Ej: 5"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 14, borderRadius: 10, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>

              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "500" }}>Costo total ($)</Text>
                <TextInput
                  value={costoCompra}
                  onChangeText={setCostoCompra}
                  keyboardType="numeric"
                  placeholder="Ej: 15.50"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 14, borderRadius: 10, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setModalCompra(false)} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarCompra} style={{ flex: 1, backgroundColor: "#F97316", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Crear/Editar Ingrediente */}
      <Modal visible={modalIng} transparent animationType="slide" onRequestClose={() => setModalIng(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.bgInput, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 16 }}>
              {ingEditId ? "Editar Ingrediente" : "Nuevo Ingrediente"}
            </Text>
            
            <View style={{ gap: 16, marginBottom: 24 }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "500" }}>Nombre</Text>
                <TextInput
                  value={ingNombre}
                  onChangeText={setIngNombre}
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 14, borderRadius: 10, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>

              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "500" }}>Unidad</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["kg", "g", "litros", "unidades"] as const).map(u => (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setIngUnidad(u)}
                      style={{ flex: 1, alignItems: "center", backgroundColor: ingUnidad === u ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgChip, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: ingUnidad === u ? "#F97316" : colors.border }}
                    >
                      <Text style={{ color: ingUnidad === u ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "500" }}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "500" }}>Stock mínimo (para alertas)</Text>
                <TextInput
                  value={ingMinimo}
                  onChangeText={setIngMinimo}
                  keyboardType="numeric"
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 14, borderRadius: 10, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setModalIng(false)} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarIngrediente} style={{ flex: 1, backgroundColor: "#F97316", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN MODAL GLOBAL PARA BODEGA */}
      {showPinModal && (
        <PinModal
          visible={showPinModal}
          titulo="Autorización de Bodega"
          onSuccess={handlePinSuccess}
          onCancel={() => {
            setShowPinModal(false);
            setPinAction(null);
          }}
        />
      )}
    </View>
  );
}
