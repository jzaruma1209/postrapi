import { useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  Alert, Platform, ActivityIndicator
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import PinModal from "../../../src/components/shared/PinModal";
import { anularVenta } from "../../../src/services/ventas.service";
import { anularPedido } from "../../../src/services/pedidos.service";
import {
  getVentasDelDia,
  getPedidosDelDia,
  getVentaItemsPorVenta,
  getPedidoItemsPorPedido,
  getProductoNombre,
} from "../../../src/services/anulacion.service";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";
import { formatTime, todayDate } from "../../../src/utils/dates";
import type { Venta, VentaItem, Pedido, PedidoItem } from "../../../src/db/schema";

type TabActivo = "ventas" | "pedidos";
type FiltroActivo = "hoy" | "ayer" | "otro";

interface VentaConItems {
  venta: Venta;
  items: VentaItem[];
  detalleStr: string;
}

interface PedidoConItems {
  pedido: Pedido;
  items: PedidoItem[];
  detalleStr: string;
}

export default function AnulacionScreen() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);

  const [tabActivo, setTabActivo] = useState<TabActivo>("ventas");

  const [filtroActivo, setFiltroActivo] = useState<FiltroActivo>("hoy");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(todayDate());
  const [showPicker, setShowPicker] = useState(false);

  const [ventasConItems, setVentasConItems] = useState<VentaConItems[]>([]);
  const [pedidosConItems, setPedidosConItems] = useState<PedidoConItems[]>([]);
  const [loading, setLoading] = useState(true);

  const [showPinModal, setShowPinModal] = useState(false);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [anulando, setAnulando] = useState(false);
  const [itemAAnular, setItemAAnular] = useState<{
    id: string;
    tipo: "venta" | "pedido";
    devolverStock?: boolean;
    estabaEntregado?: boolean;
  } | null>(null);

  const [showHistory, setShowHistory] = useState(false);

  const cargarDatos = useCallback(async (fecha: string) => {
    try {
      setLoading(true);
      const [ventasData, pedidosData] = await Promise.all([
        getVentasDelDia(fecha),
        getPedidosDelDia(fecha),
      ]);

      const ventasConDetalle = await Promise.all(
        ventasData.map(async (v) => {
          const items = await getVentaItemsPorVenta(v.id);
          const nombres = await Promise.all(
            items.map((i) => getProductoNombre(i.productoId))
          );
          const detalleStr = nombres.join(", ");
          return { venta: v, items, detalleStr };
        })
      );

      const pedidosConDetalle = await Promise.all(
        pedidosData.map(async (p) => {
          const items = await getPedidoItemsPorPedido(p.id);
          const nombres = await Promise.all(
            items.map((i) => getProductoNombre(i.productoId))
          );
          const detalleStr = nombres.join(", ");
          return { pedido: p, items, detalleStr };
        })
      );

      setVentasConItems(ventasConDetalle);
      setPedidosConItems(pedidosConDetalle);
    } catch (error) {
      console.error("Error cargando datos de anulación:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos(fechaSeleccionada);
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

  const fechaStr = useMemo(() => {
    const d = new Date(fechaSeleccionada + "T12:00:00.000Z");
    return d.toLocaleDateString("es-ES", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).replace(/^\w/, (c) => c.toUpperCase());
  }, [fechaSeleccionada]);

  const iniciarAnulacion = (id: string, tipo: "venta" | "pedido") => {
    const item = { id, tipo };
    setItemAAnular(item);
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);

    if (!itemAAnular) return;

    if (itemAAnular.tipo === "venta") {
      Alert.alert(
        "Devolver ingredientes",
        "¿Devolver ingredientes a bodega?",
        [
          {
            text: "No",
            onPress: () => {
              setItemAAnular((prev) => prev ? { ...prev, devolverStock: false } : null);
              setMotivo("");
              setShowMotivoModal(true);
            },
            style: "cancel",
          },
          {
            text: "Sí",
            onPress: () => {
              setItemAAnular((prev) => prev ? { ...prev, devolverStock: true } : null);
              setMotivo("");
              setShowMotivoModal(true);
            },
          },
        ]
      );
    } else {
      const pedido = pedidosConItems.find((p) => p.pedido.id === itemAAnular.id);
      const estabaEntregado = pedido?.pedido.estado === "entregado";
      setItemAAnular((prev) => prev ? { ...prev, estabaEntregado } : null);
      setMotivo("");
      setShowMotivoModal(true);
    }
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setItemAAnular(null);
  };

  const confirmarAnulacion = async () => {
    if (!itemAAnular || !motivo.trim()) return;

    try {
      setAnulando(true);
      setShowMotivoModal(false);

      if (itemAAnular.tipo === "venta") {
        await anularVenta(itemAAnular.id, motivo.trim(), itemAAnular.devolverStock ?? false);
        const msg = itemAAnular.devolverStock
          ? "Venta anulada correctamente.\n\nSe devolvieron ingredientes a Bodega. Revisa el stock actualizado."
          : "Venta anulada correctamente.";
        Alert.alert("Anulación exitosa", msg);
      } else {
        await anularPedido(itemAAnular.id, motivo.trim());
        const msg = itemAAnular.estabaEntregado
          ? "Pedido anulado correctamente.\n\nSe devolvieron ingredientes a Bodega. Revisa el stock actualizado."
          : "Pedido anulado correctamente.";
        Alert.alert("Anulación exitosa", msg);
      }

      setItemAAnular(null);
      setMotivo("");
      cargarDatos(fechaSeleccionada);
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "No se pudo anular.");
    } finally {
      setAnulando(false);
    }
  };

  const cancelarMotivo = () => {
    setShowMotivoModal(false);
    setItemAAnular(null);
    setMotivo("");
  };

  const chipStyle = (activo: boolean) => ({
    backgroundColor: activo ? "#F97316" : colors.bgChip,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  });

  const chipTextStyle = (activo: boolean) => ({
    color: activo ? "#fff" : colors.textLight,
    fontSize: 12,
    fontWeight: activo ? "600" : "500" as const,
  });

  const cardStyle = {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: isDark ? 0.5 : 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  };

  const ventasAnuladas = ventasConItems.filter((v) => v.venta.anulada === 1);
  const pedidosAnulados = pedidosConItems.filter((p) => p.pedido.estado === "anulado");

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: colors.bg,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="arrow-left" size={20} color={colors.text} />
          <View>
            <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>Anulación</Text>
            <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{fechaStr}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 12 }}>
        <TouchableOpacity onPress={() => setTabActivo("ventas")} style={chipStyle(tabActivo === "ventas")}>
          <Text style={chipTextStyle(tabActivo === "ventas")}>Ventas</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setTabActivo("pedidos")} style={chipStyle(tabActivo === "pedidos")}>
          <Text style={chipTextStyle(tabActivo === "pedidos")}>Pedidos</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 12 }}>
        <TouchableOpacity onPress={seleccionarHoy} style={chipStyle(filtroActivo === "hoy")}>
          <Text style={chipTextStyle(filtroActivo === "hoy")}>Hoy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={seleccionarAyer} style={chipStyle(filtroActivo === "ayer")}>
          <Text style={chipTextStyle(filtroActivo === "ayer")}>Ayer</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={seleccionarOtros} style={chipStyle(filtroActivo === "otro")}>
          <Text style={chipTextStyle(filtroActivo === "otro")}>Otros</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={new Date(fechaSeleccionada + "T12:00:00.000Z")}
          mode="date"
          display="default"
          onChange={seleccionarFecha}
        />
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {tabActivo === "ventas" ? (
            ventasConItems.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 14 }}>
                No hay ventas en esta fecha
              </Text>
            ) : (
              ventasConItems.map((v) => (
                <View key={v.venta.id} style={cardStyle}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {formatTime(v.venta.created_at)}
                    </Text>
                    <Text style={{ color: "#F97316", fontSize: 15, fontWeight: "bold" }}>
                      ${Number(v.venta.total).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textLight, fontSize: 12, marginBottom: 6 }} numberOfLines={1}>
                    {v.detalleStr || "Sin items"}
                  </Text>
                  {v.venta.anulada === 1 ? (
                    <View style={{ backgroundColor: isDark ? "#2a0000" : "#fff0f0", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#ef444460" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>ANULADA</Text>
                        </View>
                        {v.venta.anuladaAt && (
                          <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                            {new Date(v.venta.anuladaAt).toLocaleString("es-ES", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </Text>
                        )}
                      </View>
                      {v.venta.motivoAnulacion && (
                        <Text style={{ color: colors.textLight, fontSize: 12 }}>
                          Motivo: {v.venta.motivoAnulacion}
                        </Text>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => iniciarAnulacion(v.venta.id, "venta")}
                      style={{
                        backgroundColor: "#ef4444", paddingVertical: 8, borderRadius: 8,
                        alignItems: "center", marginTop: 4,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Anular</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )
          ) : (
            pedidosConItems.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 14 }}>
                No hay pedidos en esta fecha
              </Text>
            ) : (
              pedidosConItems.map((p) => {
                const colorEstado =
                  p.pedido.estado === "entregado" ? "#22c55e" :
                  p.pedido.estado === "preparando" ? "#F97316" :
                  p.pedido.estado === "anulado" ? "#ef4444" :
                  colors.textMuted;
                return (
                  <View key={p.pedido.id} style={cardStyle}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                        {formatTime(p.pedido.created_at)}
                      </Text>
                      <View style={{ backgroundColor: `${colorEstado}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: colorEstado, fontSize: 11, fontWeight: "600", textTransform: "capitalize" }}>
                          {p.pedido.estado}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500", marginBottom: 2 }}>
                      {p.pedido.clienteNombre || "Sin nombre"}
                    </Text>
                    <Text style={{ color: colors.textLight, fontSize: 12 }} numberOfLines={1}>
                      {p.detalleStr || "Sin items"}
                    </Text>
                    {p.pedido.estado === "anulado" ? (
                      <View style={{ backgroundColor: isDark ? "#2a0000" : "#fff0f0", borderRadius: 8, padding: 10, marginTop: 8, borderWidth: 1, borderColor: "#ef444460" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <View style={{ backgroundColor: "#ef4444", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>ANULADO</Text>
                          </View>
                          {p.pedido.anuladoAt && (
                            <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                              {new Date(p.pedido.anuladoAt).toLocaleString("es-ES", {
                                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                              })}
                            </Text>
                          )}
                        </View>
                        {p.pedido.motivoAnulacion && (
                          <Text style={{ color: colors.textLight, fontSize: 12 }}>
                            Motivo: {p.pedido.motivoAnulacion}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => iniciarAnulacion(p.pedido.id, "pedido")}
                        style={{
                          backgroundColor: "#ef4444", paddingVertical: 8, borderRadius: 8,
                          alignItems: "center", marginTop: 8,
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>Anular</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )
          )}

          {(ventasAnuladas.length > 0 || pedidosAnulados.length > 0) && (
            <View style={{ marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setShowHistory(!showHistory)}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                  backgroundColor: colors.bgCard, borderRadius: 14,
                  borderWidth: isDark ? 0.5 : 1, borderColor: colors.border, padding: 14,
                }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Feather name="archive" size={16} color={colors.textMuted} />
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                    Historial de anulaciones
                  </Text>
                  <View style={{ backgroundColor: "#ef4444", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>
                      {ventasAnuladas.length + pedidosAnulados.length}
                    </Text>
                  </View>
                </View>
                <Feather name={showHistory ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {showHistory && (
                <View style={{ marginTop: 8, gap: 8 }}>
                  {ventasAnuladas.map((v) => (
                    <View key={`hist-v-${v.venta.id}`} style={cardStyle}>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 2 }}>
                        Venta · {formatTime(v.venta.created_at)}
                      </Text>
                      <Text style={{ color: "#F97316", fontSize: 14, fontWeight: "bold" }}>
                        ${Number(v.venta.total).toFixed(2)}
                      </Text>
                      {v.venta.motivoAnulacion && (
                        <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 2 }}>
                          Motivo: {v.venta.motivoAnulacion}
                        </Text>
                      )}
                      {v.venta.anuladaAt && (
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                          Anulada: {new Date(v.venta.anuladaAt).toLocaleString("es-ES", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      )}
                    </View>
                  ))}
                  {pedidosAnulados.map((p) => (
                    <View key={`hist-p-${p.pedido.id}`} style={cardStyle}>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 2 }}>
                        Pedido · {formatTime(p.pedido.created_at)}
                      </Text>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>
                        {p.pedido.clienteNombre || "Sin nombre"}
                      </Text>
                      {p.pedido.motivoAnulacion && (
                        <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 2 }}>
                          Motivo: {p.pedido.motivoAnulacion}
                        </Text>
                      )}
                      {p.pedido.anuladoAt && (
                        <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                          Anulado: {new Date(p.pedido.anuladoAt).toLocaleString("es-ES", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      <PinModal
        visible={showPinModal}
        titulo="PIN de Supervisor"
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
      />

      <Modal visible={showMotivoModal} transparent animationType="fade" onRequestClose={cancelarMotivo}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center" }}>
          <View style={{
            backgroundColor: colors.bgCard, borderRadius: 20, borderWidth: 0.5,
            borderColor: colors.border, padding: 24, width: 300,
          }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500", marginBottom: 16, textAlign: "center" }}>
              Motivo de anulación
            </Text>
            <TextInput
              style={{
                backgroundColor: colors.bgInput, color: colors.text, fontSize: 14,
                borderRadius: 10, padding: 12, borderWidth: 1, borderColor: colors.border,
                minHeight: 80, textAlignVertical: "top",
              }}
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Escribe el motivo..."
              placeholderTextColor={colors.textMuted}
              multiline
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={cancelarMotivo}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10,
                  backgroundColor: colors.bgInput, alignItems: "center",
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmarAnulacion}
                disabled={!motivo.trim() || anulando}
                style={{
                  flex: 1, paddingVertical: 12, borderRadius: 10,
                  backgroundColor: motivo.trim() && !anulando ? "#ef4444" : colors.bgInput,
                  alignItems: "center",
                }}
                activeOpacity={0.7}
              >
                {anulando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: motivo.trim() && !anulando ? "#fff" : colors.textMuted, fontSize: 14, fontWeight: "600" }}>
                    Anular
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
