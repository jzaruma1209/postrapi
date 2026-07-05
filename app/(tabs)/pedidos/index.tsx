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
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { db } from "../../../src/db";
import { productos, Producto, Pedido, configuracion } from "../../../src/db/schema";
import TicketModal from "../../../src/components/shared/TicketModal";
import PinModal from "../../../src/components/shared/PinModal";
import type { DatosTicket } from "../../../src/services/printer.service";
import {
  getPedidosHoy,
  getPedidoItems,
  crearPedido,
  cambiarEstadoPedido,
  entregarPedido,
  anularPedido,
  ItemPedido,
} from "../../../src/services/pedidos.service";
import type { OrigenPedido, MetodoPago, EstadoPedido } from "../../../src/utils/types";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

type PedidoCompleto = Pedido & {
  resumenItems: string;
};

export default function PedidosIndex() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);

  const [pedidosLista, setPedidosLista] = useState<PedidoCompleto[]>([]);
  const [filtro, setFiltro] = useState<"todos" | EstadoPedido>("todos");

  // Creación de Pedido Modal
  const [modalNuevo, setModalNuevo] = useState(false);
  const [listaProductos, setListaProductos] = useState<Producto[]>([]);
  const [carritoNuevo, setCarritoNuevo] = useState<ItemPedido[]>([]);
  const [clienteNombre, setClienteNombre] = useState("");
  const [nota, setNota] = useState("");
  const [origen, setOrigen] = useState<OrigenPedido>("en_persona");
  const [procesando, setProcesando] = useState(false);

  // Anulación
  const [showPinModal, setShowPinModal] = useState(false);
  const [pedidoAAnular, setPedidoAAnular] = useState<{ id: string; estado: string } | null>(null);
  const [showMotivoModal, setShowMotivoModal] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);

  const fechaHoyStr = useMemo(() => {
    const fecha = new Date();
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const formateada = fecha.toLocaleDateString('es-ES', opciones);
    return formateada.charAt(0).toUpperCase() + formateada.slice(1);
  }, []);

  // Cobro Modal
  const [modalCobro, setModalCobro] = useState(false);
  const [pedidoACobrar, setPedidoACobrar] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");

  // Ticket Modal State
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [ticketDatos, setTicketDatos] = useState<DatosTicket | null>(null);

  const cerrarTicket = () => {
    setMostrarTicket(false);
    setTicketDatos(null);
  };

  const cargarPedidos = async () => {
    try {
      const hoyPedidos = await getPedidosHoy();
      const conItems = await Promise.all(
        hoyPedidos.map(async (ped) => {
          const items = await getPedidoItems(ped.id);
          const nombres: string[] = [];
          for (const it of items) {
            const prod = await db.select().from(productos).where(eq(productos.id, it.productoId)).limit(1);
            nombres.push(`${prod[0]?.nombre || "Desconocido"} × ${it.cantidad}`);
          }
          return { ...ped, resumenItems: nombres.join(" · ") };
        })
      );
      setPedidosLista(conItems);
    } catch (error) {
      console.error("Error al cargar pedidos:", error);
    }
  };

  const cargarProductos = async () => {
    try {
      const prods = await db.select().from(productos).where(eq(productos.activo, 1));
      setListaProductos(prods);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarPedidos();
      cargarProductos();
    }, [])
  );

  const getIconoOrigen = (ori: string) => {
    switch (ori) {
      case "en_persona": return "user";
      case "whatsapp": return "message-circle";
      case "llamada": return "phone";
      default: return "user";
    }
  };

  const getColorEstado = (est: string) => {
    switch (est) {
      case "pendiente": return "#F97316";
      case "preparando": return "#38bdf8";
      case "entregado": return "#22c55e";
      default: return "#888";
    }
  };

  const getBgEstado = (est: string) => {
    if (isDark) {
      switch (est) {
        case "pendiente": return "#2a1a00";
        case "preparando": return "#001a2a";
        case "entregado": return "#001a10";
        default: return "#2a2a2a";
      }
    } else {
      switch (est) {
        case "pendiente": return "#fff4e6";
        case "preparando": return "#e0f2fe";
        case "entregado": return "#dcfce7";
        default: return "#f0f0f0";
      }
    }
  };

  const handlePreparando = async (id: string) => {
    try {
      await cambiarEstadoPedido(id, "preparando");
      cargarPedidos();
    } catch (err) {
      console.error(err);
    }
  };

  const abrirCobro = (id: string) => {
    setPedidoACobrar(id);
    setMetodoPago("efectivo");
    setModalCobro(true);
  };

  const confirmarCobro = async () => {
    if (!pedidoACobrar) return;
    setProcesando(true);
    try {
      const ventaId = await entregarPedido(pedidoACobrar, metodoPago);
      
      const conf = await db.select().from(configuracion).where(eq(configuracion.clave, "nombre_negocio")).limit(1);
      const negocio = conf[0]?.valor || "Postrapi";
      
      const items = await getPedidoItems(pedidoACobrar);
      const itemsConInfo = await Promise.all(
        items.map(async (item) => {
          const prod = await db.select().from(productos).where(eq(productos.id, item.productoId)).limit(1);
          return {
            nombre: prod[0]?.nombre || "Producto",
            cantidad: item.cantidad,
            precioUnitario: prod[0]?.precio || 0,
            subtotal: item.cantidad * (prod[0]?.precio || 0)
          };
        })
      );
      const total = itemsConInfo.reduce((acc, curr) => acc + curr.subtotal, 0);

      const ticket: DatosTicket = {
        negocio,
        fecha: new Date().toISOString(),
        items: itemsConInfo,
        total,
        metodoPago,
        ventaId
      };

      setModalCobro(false);
      setPedidoACobrar(null);
      cargarPedidos();
      
      setTicketDatos(ticket);
      setMostrarTicket(true);
    } catch (err) {
      const errorMsg = (err as Error).message || "";
      if (errorMsg.includes("No hay una caja abierta")) {
        console.log("Caja cerrada:", errorMsg);
        Alert.alert(
          "Caja Cerrada",
          "Debes abrir la caja antes de cobrar el pedido.",
          [
            { text: "Ir a Caja", onPress: () => {
              setModalCobro(false);
              setPedidoACobrar(null);
              router.push("/ventas/caja");
            }},
            { text: "Cancelar", style: "cancel" }
          ]
        );
      } else {
        console.error(err);
        Alert.alert("Error", errorMsg || "No se pudo entregar y cobrar el pedido.");
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleAgregarAlCarrito = (prod: Producto) => {
    setCarritoNuevo(prev => {
      const ex = prev.find(i => i.productoId === prod.id);
      if (ex) return prev.map(i => i.productoId === prod.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { productoId: prod.id, nombre: prod.nombre, precioUnitario: prod.precio, cantidad: 1 }];
    });
  };

  const handleRestarDelCarrito = (prodId: string) => {
    setCarritoNuevo(prev => {
      const ex = prev.find(i => i.productoId === prodId);
      if (ex && ex.cantidad > 1) return prev.map(i => i.productoId === prodId ? { ...i, cantidad: i.cantidad - 1 } : i);
      return prev.filter(i => i.productoId !== prodId);
    });
  };

  const getCantEnCarrito = (id: string) => carritoNuevo.find(i => i.productoId === id)?.cantidad || 0;

  const confirmarCrearPedido = async () => {
    if (carritoNuevo.length === 0) {
      Alert.alert("Error", "El pedido debe tener al menos un producto.");
      return;
    }
    setProcesando(true);
    try {
      await crearPedido({
        items: carritoNuevo,
        clienteNombre: clienteNombre.trim(),
        nota: nota.trim(),
        origen,
      });
      setModalNuevo(false);
      setCarritoNuevo([]);
      setClienteNombre("");
      setNota("");
      setOrigen("en_persona");
      cargarPedidos();
    } catch (err) {
      const errorMsg = (err as Error).message || "";
      if (errorMsg.includes("No hay una caja abierta")) {
        console.log("Caja cerrada:", errorMsg);
        Alert.alert(
          "Caja Cerrada",
          "Debes abrir la caja antes de crear un pedido.",
          [
            { text: "Ir a Caja", onPress: () => {
              setCarritoNuevo([]);
              setClienteNombre("");
              setNota("");
              setOrigen("en_persona");
              setModalNuevo(false);
              router.push("/ventas/caja");
            }},
            { text: "Cancelar", style: "cancel", onPress: () => {
              setCarritoNuevo([]);
              setClienteNombre("");
              setNota("");
              setOrigen("en_persona");
              setModalNuevo(false);
            }}
          ]
        );
      } else {
        console.error(err);
        Alert.alert("Error", errorMsg || "No se pudo crear el pedido.");
      }
    } finally {
      setProcesando(false);
    }
  };

  const handleAnular = (ped: PedidoCompleto) => {
    setPedidoAAnular({ id: ped.id, estado: ped.estado });
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setMotivoAnulacion("");
    setShowMotivoModal(true);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPedidoAAnular(null);
  };

  const handleConfirmarAnulacion = async () => {
    if (!motivoAnulacion.trim()) {
      Alert.alert("Error", "Debes ingresar un motivo de anulación.");
      return;
    }
    if (!pedidoAAnular) return;
    setProcesandoAnulacion(true);
    try {
      await anularPedido(pedidoAAnular.id, motivoAnulacion.trim());
      setShowMotivoModal(false);
      setMotivoAnulacion("");
      if (pedidoAAnular.estado === "entregado") {
        Alert.alert(
          "Pedido anulado",
          "Se devolvieron ingredientes a Bodega — revisa el stock actualizado."
        );
      } else {
        Alert.alert("Pedido anulado", "El pedido ha sido anulado correctamente.");
      }
      setPedidoAAnular(null);
      cargarPedidos();
    } catch (err) {
      Alert.alert("Error", (err as Error).message || "No se pudo anular el pedido.");
    } finally {
      setProcesandoAnulacion(false);
    }
  };

  const pedidosFiltrados = pedidosLista.filter(p => filtro === "todos" || p.estado === filtro);

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
          paddingBottom: 24,
          backgroundColor: colors.bg,
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>Pedidos</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{fechaHoyStr}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalNuevo(true)}
          style={{ backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Chips de filtro */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(["todos", "pendiente", "preparando", "entregado"] as const).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFiltro(f)}
              style={{
                backgroundColor: filtro === f ? "#F97316" : colors.bgChip,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: filtro === f ? "#F97316" : colors.border,
              }}
            >
              <Text style={{ color: filtro === f ? "#fff" : colors.textMuted, fontSize: 12, fontWeight: filtro === f ? "600" : "400", textTransform: "capitalize" }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de Pedidos */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {pedidosFiltrados.map(ped => (
          <View
            key={ped.id}
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 14,
              borderWidth: isDark ? 0.5 : 1,
              borderColor: colors.border,
              borderLeftWidth: 3,
              borderLeftColor: ped.estado === "anulado" ? "#ef4444" : getColorEstado(ped.estado),
              padding: 16,
              gap: 8,
              opacity: ped.estado === "entregado" || ped.estado === "anulado" ? 0.6 : 1,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name={getIconoOrigen(ped.origen)} size={14} color={colors.textMuted} />
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "600" }}>
                  {ped.clienteNombre || "Sin nombre"}
                </Text>
              </View>
              <View style={{
                backgroundColor: ped.estado === "anulado" ? "#2a0000" : getBgEstado(ped.estado),
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 10,
              }}>
                <Text style={{
                  color: ped.estado === "anulado" ? "#ef4444" : getColorEstado(ped.estado),
                  fontSize: 11,
                  fontWeight: ped.estado === "anulado" ? "700" : "600",
                  textTransform: ped.estado === "anulado" ? "uppercase" : "capitalize",
                }}>
                  {ped.estado === "anulado" ? "ANULADO" : ped.estado}
                </Text>
              </View>
            </View>

            <Text style={{ color: colors.textLight, fontSize: 12, lineHeight: 18 }}>
              {ped.resumenItems}
            </Text>

            {!!ped.nota && (
              <Text style={{ color: colors.textMuted, fontSize: 11, fontStyle: "italic" }}>
                Nota: {ped.nota}
              </Text>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>
                {new Date(ped.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>

              {ped.estado === "pendiente" && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => handlePreparando(ped.id)}
                    style={{ backgroundColor: "#38bdf8", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Preparando</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAnular(ped)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ef4444", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                  >
                    <Feather name="x-circle" size={12} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Anular</Text>
                  </TouchableOpacity>
                </View>
              )}

              {ped.estado === "preparando" && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => abrirCobro(ped.id)}
                    style={{ backgroundColor: "#22c55e", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Entregar y cobrar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAnular(ped)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#ef4444", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                  >
                    <Feather name="x-circle" size={12} color="#fff" />
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Anular</Text>
                  </TouchableOpacity>
                </View>
              )}

              {ped.estado === "anulado" && (
                <View style={{ backgroundColor: "#2a0000", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                  <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "700" }}>ANULADO</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {pedidosFiltrados.length === 0 && (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Feather name="clipboard" size={32} color={colors.tabInactive} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>No hay pedidos en este estado hoy.</Text>
          </View>
        )}
      </ScrollView>

      {/* Modal Nuevo Pedido */}
      <Modal visible={modalNuevo} transparent animationType="slide" onRequestClose={() => { setCarritoNuevo([]); setClienteNombre(""); setNota(""); setOrigen("en_persona"); setModalNuevo(false); }}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: "85%" }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.bgInput, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 16 }}>Nuevo Pedido</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12, marginBottom: 16 }}>
                <TextInput
                  value={clienteNombre}
                  onChangeText={setClienteNombre}
                  placeholder="Nombre del cliente (opcional)"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 12, borderRadius: 10, fontSize: 14, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
                <TextInput
                  value={nota}
                  onChangeText={setNota}
                  placeholder="Nota (opcional)"
                  placeholderTextColor={colors.textMuted}
                  style={{ backgroundColor: colors.bgInput, color: colors.text, padding: 12, borderRadius: 10, fontSize: 14, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}
                />
              </View>

              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Origen</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                {(["en_persona", "whatsapp", "llamada"] as const).map(ori => (
                  <TouchableOpacity
                    key={ori}
                    onPress={() => setOrigen(ori)}
                    style={{
                      flex: 1,
                      alignItems: "center",
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: origen === ori ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput,
                      borderWidth: 1,
                      borderColor: origen === ori ? "#F97316" : colors.border,
                    }}
                  >
                    <Feather name={getIconoOrigen(ori)} size={16} color={origen === ori ? "#F97316" : colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Productos del Menú</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
                {listaProductos.map(prod => {
                  const qty = getCantEnCarrito(prod.id);
                  return (
                    <View key={prod.id} style={{ width: "48%", backgroundColor: colors.bgInput, borderRadius: 10, padding: 12, alignItems: "center", borderWidth: isDark ? 0 : 1, borderColor: colors.border }}>
                      <Text style={{ color: colors.textLight, fontSize: 12, textAlign: "center", marginBottom: 4 }} numberOfLines={1}>{prod.nombre}</Text>
                      <Text style={{ color: "#F97316", fontSize: 13, fontWeight: "bold", marginBottom: 10 }}>${prod.precio.toFixed(2)}</Text>
                      {qty > 0 ? (
                        <View style={{ flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "space-between", borderWidth: 1, borderColor: "#F97316", borderRadius: 6 }}>
                          <TouchableOpacity onPress={() => handleRestarDelCarrito(prod.id)} style={{ padding: 6 }}><Feather name="minus" size={14} color="#F97316" /></TouchableOpacity>
                          <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{qty}</Text>
                          <TouchableOpacity onPress={() => handleAgregarAlCarrito(prod)} style={{ padding: 6 }}><Feather name="plus" size={14} color="#F97316" /></TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => handleAgregarAlCarrito(prod)} style={{ backgroundColor: "#F97316", width: "100%", alignItems: "center", padding: 6, borderRadius: 6 }}>
                          <Feather name="plus" size={14} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={() => { setCarritoNuevo([]); setClienteNombre(""); setNota(""); setOrigen("en_persona"); setModalNuevo(false); }} disabled={procesando} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarCrearPedido} disabled={procesando} style={{ flex: 1, backgroundColor: procesando ? "#aaa" : "#F97316", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>{procesando ? "Creando..." : "Crear Pedido"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cobro */}
      <Modal visible={modalCobro} transparent animationType="fade" onRequestClose={() => setModalCobro(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: colors.bgCard, width: "100%", borderRadius: 20, padding: 24, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 16, textAlign: "center" }}>
              Entregar y Cobrar
            </Text>

            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Método de Pago</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setMetodoPago("efectivo")}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: metodoPago === "efectivo" ? "#F97316" : colors.border, backgroundColor: metodoPago === "efectivo" ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput, alignItems: "center" }}
              >
                <Text style={{ color: metodoPago === "efectivo" ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "600" }}>Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMetodoPago("transferencia")}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: metodoPago === "transferencia" ? "#F97316" : colors.border, backgroundColor: metodoPago === "transferencia" ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput, alignItems: "center" }}
              >
                <Text style={{ color: metodoPago === "transferencia" ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "600" }}>Transferencia</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setModalCobro(false)} disabled={procesando} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarCobro} disabled={procesando} style={{ flex: 1, backgroundColor: procesando ? "#aaa" : "#22c55e", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>{procesando ? "Procesando..." : "Confirmar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Ticket */}
      <TicketModal 
        visible={mostrarTicket}
        datos={ticketDatos}
        onClose={cerrarTicket}
      />

      {/* Modal PIN para Anular */}
      <PinModal
        visible={showPinModal}
        titulo="PIN de Supervisor"
        onSuccess={handlePinSuccess}
        onCancel={handlePinCancel}
      />

      {/* Modal Motivo de Anulación */}
      <Modal visible={showMotivoModal} transparent animationType="fade" onRequestClose={() => { if (!procesandoAnulacion) { setShowMotivoModal(false); setPedidoAAnular(null); } }}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: colors.bgCard, width: "100%", borderRadius: 20, padding: 24, borderWidth: isDark ? 0 : 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 8, textAlign: "center" }}>
              Anular Pedido
            </Text>

            {pedidoAAnular?.estado === "entregado" && (
              <Text style={{ color: "#ef4444", fontSize: 13, marginBottom: 16, textAlign: "center", lineHeight: 20 }}>
                Este pedido ya fue cobrado. Al anularlo se devolverán los ingredientes a Bodega.
              </Text>
            )}

            {pedidoAAnular?.estado !== "entregado" && (
              <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, textAlign: "center" }}>
                ¿Confirmas anular este pedido?
              </Text>
            )}

            <TextInput
              value={motivoAnulacion}
              onChangeText={setMotivoAnulacion}
              placeholder="Motivo de anulación (requerido)"
              placeholderTextColor={colors.textMuted}
              style={{
                backgroundColor: colors.bgInput,
                color: colors.text,
                padding: 12,
                borderRadius: 10,
                fontSize: 14,
                borderWidth: isDark ? 0 : 1,
                borderColor: colors.border,
                marginBottom: 20,
              }}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => { setShowMotivoModal(false); setPedidoAAnular(null); setMotivoAnulacion(""); }}
                disabled={procesandoAnulacion}
                style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmarAnulacion}
                disabled={procesandoAnulacion}
                style={{ flex: 1, backgroundColor: procesandoAnulacion ? "#aaa" : "#ef4444", padding: 14, borderRadius: 10, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>{procesandoAnulacion ? "Anulando..." : "Confirmar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
