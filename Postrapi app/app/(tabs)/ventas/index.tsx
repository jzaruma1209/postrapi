import { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { eq, and, gte, lte } from "drizzle-orm";
import { db } from "../../../src/db";
import { productos, Producto, ventas } from "../../../src/db/schema";
import { useVentasStore } from "../../../src/stores/useVentasStore";
import { crearVenta, getCajaAbierta } from "../../../src/services/ventas.service";
import type { MetodoPago } from "../../../src/utils/types";
import { parseNumber } from "../../../src/utils/numbers";
import { configuracion } from "../../../src/db/schema";
import TicketModal from "../../../src/components/shared/TicketModal";
import type { DatosTicket } from "../../../src/services/printer.service";
import PinModal from "../../../src/components/shared/PinModal";
import { inicioDia, finDia, todayDate } from "../../../src/utils/dates";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

export default function VentasIndex() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const [listaProductos, setListaProductos] = useState<Producto[]>([]);
  
  // Zustand Store
  const carrito = useVentasStore((state) => state.carrito);
  const agregarItem = useVentasStore((state) => state.agregarItem);
  const actualizarCantidad = useVentasStore((state) => state.actualizarCantidad);
  const limpiarCarrito = useVentasStore((state) => state.limpiarCarrito);
  const totalCarrito = useVentasStore((state) => state.totalCarrito());

  // Cobro Modal State
  const [modalCobro, setModalCobro] = useState(false);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");
  const [procesando, setProcesando] = useState(false);

  const [filtroCategoria, setFiltroCategoria] = useState<string>("todos");
  const scrollRef = useRef<ScrollView>(null);

  // Descuento State
  const [descuentoActivo, setDescuentoActivo] = useState(false);
  const [descuentoTipo, setDescuentoTipo] = useState<'monto' | 'porcentaje'>('monto');
  const [descuentoValorStr, setDescuentoValorStr] = useState('');

  const subtotal = useMemo(() => totalCarrito, [totalCarrito]);

  const descuentoCalculado = useMemo(() => {
    if (!descuentoActivo || !descuentoValorStr) return 0;
    const valor = parseNumber(descuentoValorStr);
    if (isNaN(valor) || valor <= 0) return 0;
    if (descuentoTipo === 'monto') return Math.min(valor, subtotal);
    return Math.min(subtotal * (valor / 100), subtotal);
  }, [descuentoActivo, descuentoValorStr, descuentoTipo, subtotal]);

  const totalConDescuento = useMemo(() => subtotal - descuentoCalculado, [subtotal, descuentoCalculado]);

  const errorDescuento = useMemo(() => {
    if (!descuentoActivo || !descuentoValorStr) return null;
    const valor = parseNumber(descuentoValorStr);
    if (isNaN(valor) || valor <= 0) return null;
    if (descuentoTipo === 'monto' && valor > subtotal) return "El descuento no puede ser mayor al total.";
    if (descuentoTipo === 'porcentaje' && valor > 100) return "El porcentaje no puede ser mayor a 100%.";
    return null;
  }, [descuentoActivo, descuentoValorStr, descuentoTipo, subtotal]);

  // PIN Modal State for old caja warning
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinDescuento, setPinDescuento] = useState(false);

  const fechaHoyStr = useMemo(() => {
    const fecha = new Date();
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const formateada = fecha.toLocaleDateString('es-ES', opciones);
    return formateada.charAt(0).toUpperCase() + formateada.slice(1);
  }, []);

  // Ticket Modal State
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [ticketDatos, setTicketDatos] = useState<DatosTicket | null>(null);

  const cargarProductos = async () => {
    try {
      const data = await db.select().from(productos).where(eq(productos.activo, 1));
      setListaProductos(data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
      setFiltroCategoria("todos");
      limpiarCarrito();
      setModalCobro(false);
      setDescuentoActivo(false);
      setDescuentoValorStr('');
      setDescuentoTipo('monto');
      setShowPinModal(false);
      setMostrarTicket(false);
      setTicketDatos(null);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  const productosFiltrados = useMemo(() => {
    if (filtroCategoria === "todos") return listaProductos;
    return listaProductos.filter((p) => p.categoria === filtroCategoria);
  }, [listaProductos, filtroCategoria]);

  const getCantidadEnCarrito = (productoId: string) => {
    const item = carrito.find((i) => i.productoId === productoId);
    return item ? item.cantidad : 0;
  };

  const handleAgregar = (prod: Producto) => {
    agregarItem({
      productoId: prod.id,
      nombre: prod.nombre,
      precioUnitario: prod.precio,
      cantidad: 1,
    });
  };

  const confirmarVenta = async () => {
    if (carrito.length === 0) return;
    setProcesando(true);
    try {
      const cajaAbierta = await getCajaAbierta();
      if (!cajaAbierta) {
        Alert.alert(
          "Caja Cerrada",
          "Debes abrir la caja antes de registrar una venta.",
          [
            { text: "Ir a Caja", onPress: () => {
              handleCerrarCobro();
              router.push("/ventas/caja");
            }},
            { text: "Cancelar", style: "cancel", onPress: () => {
              handleCerrarCobro();
            }}
          ]
        );
        setProcesando(false);
        return;
      }

      if (cajaAbierta.fecha !== todayDate()) {
        Alert.alert(
          "Caja del día anterior",
          `La caja actual se abrió el día anterior (${cajaAbierta.fecha}). ¿Deseas continuar vendiendo en ella? (Requiere PIN de supervisor)`,
          [
            { text: "No, ir a cerrar caja", onPress: () => {
              handleCerrarCobro();
              router.push("/ventas/caja");
            }},
            { text: "Sí, continuar con PIN", onPress: () => {
              setProcesando(false);
              setShowPinModal(true);
            }}
          ]
        );
        return;
      }

      await ejecutarConfirmarVenta();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo procesar la venta.");
      setProcesando(false);
    }
  };

  const ejecutarConfirmarVenta = async () => {
    setProcesando(true);
    try {
      const ventaId = await crearVenta({
        items: carrito,
        metodoPago,
        descuentoTipo: descuentoActivo ? descuentoTipo : undefined,
        descuentoValor: descuentoActivo && descuentoValorStr ? parseNumber(descuentoValorStr) : undefined,
      });

      // Compute sequential number for today
      const today = todayDate();
      const ventasDelDia = await db
        .select({ id: ventas.id, created_at: ventas.created_at })
        .from(ventas)
        .where(
          and(
            gte(ventas.created_at, inicioDia(today)),
            lte(ventas.created_at, finDia(today))
          )
        )
        .orderBy(ventas.created_at);
      const idx = ventasDelDia.findIndex((v) => v.id === ventaId);
      const numeroVenta = idx >= 0 ? idx + 1 : undefined;

      const conf = await db.select().from(configuracion).where(eq(configuracion.clave, "nombre_negocio")).limit(1);
      const negocio = conf[0]?.valor || "Postrapi";

      const ticket: DatosTicket = {
        negocio,
        fecha: new Date().toISOString(),
        numeroVenta,
        items: carrito.map(i => ({
          nombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          subtotal: i.cantidad * i.precioUnitario
        })),
        subtotal,
        descuentoTipo: descuentoActivo ? descuentoTipo : null,
        descuentoValor: descuentoActivo && descuentoValorStr ? parseNumber(descuentoValorStr) : null,
        total: descuentoActivo ? totalConDescuento : subtotal,
        metodoPago,
        ventaId
      };

      handleCerrarCobro();
      
      setTicketDatos(ticket);
      setMostrarTicket(true);

    } catch (error) {
      console.error(error);
      Alert.alert("Error", (error as Error).message || "No se pudo procesar la venta.");
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelarCarrito = () => {
    Alert.alert(
      "Cancelar venta",
      "¿Estás seguro? Se eliminarán todos los productos del carrito.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, vaciar",
          style: "destructive",
          onPress: () => {
            limpiarCarrito();
            setFiltroCategoria("todos");
          },
        },
      ]
    );
  };

  const handleCerrarCobro = () => {
    limpiarCarrito();
    setDescuentoActivo(false);
    setDescuentoValorStr('');
    setDescuentoTipo('monto');
    setModalCobro(false);
  };

  const cerrarTicket = () => {
    setMostrarTicket(false);
    setTicketDatos(null);
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
          paddingBottom: 24,
          backgroundColor: colors.bg,
        }}
      >
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>Ventas</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{fechaHoyStr}</Text>
        </View>
        
        <View style={{ backgroundColor: "#F97316", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 }}>
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>Total: ${totalCarrito.toFixed(2)}</Text>
        </View>
      </View>

      {/* Sub-navegación (Chips de módulos) */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={{ backgroundColor: "#F97316", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 }}
          >
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Nueva Venta</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/ventas/historial")}
            style={{
              backgroundColor: colors.bgCard,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Historial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/ventas/caja")}
            style={{
              backgroundColor: colors.bgCard,
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Caja</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Categorías */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {(["todos", "combo", "bebida", "porcion"] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setFiltroCategoria(cat)}
              style={{
                backgroundColor: filtroCategoria === cat
                  ? "#F97316"
                  : isDark
                    ? "#1e1e1e"
                    : "#fff4e6",
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: filtroCategoria === cat ? "#F97316" : colors.border,
              }}
            >
              <Text
                style={{
                  color: filtroCategoria === cat ? "#fff" : "#F97316",
                  fontSize: 12,
                  fontWeight: "600",
                  textTransform: "capitalize",
                }}
              >
                {cat === "todos" ? "Todos" : cat === "combo" ? "Combos" : cat === "bebida" ? "Bebidas" : "Porciones"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grid de Productos */}
      <ScrollView 
        ref={scrollRef}
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 220 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
          {productosFiltrados.map((prod) => {
            const qty = getCantidadEnCarrito(prod.id);
            return (
              <View
                key={prod.id}
                style={{
                  width: "48%",
                  backgroundColor: colors.bgCard,
                  borderRadius: 12,
                  borderWidth: isDark ? 0.5 : 1,
                  borderColor: colors.border,
                  padding: 12,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    backgroundColor: isDark ? "#2a1a00" : "#fff4e6",
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 8,
                  }}
                >
                  <Feather name="box" size={20} color="#F97316" />
                </View>

                <Text style={{ fontSize: 12, color: colors.textLight, textAlign: "center", marginBottom: 4 }} numberOfLines={2}>
                  {prod.nombre}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#F97316", marginBottom: 10 }}>
                  ${prod.precio.toFixed(2)}
                </Text>

                {qty > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.bgInput,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: "#F97316",
                      width: "100%",
                      justifyContent: "space-between",
                    }}
                  >
                    <TouchableOpacity onPress={() => actualizarCantidad(prod.id, qty - 1)} style={{ padding: 8 }}>
                      <Feather name="minus" size={14} color="#F97316" />
                    </TouchableOpacity>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>{qty}</Text>
                    <TouchableOpacity onPress={() => actualizarCantidad(prod.id, qty + 1)} style={{ padding: 8 }}>
                      <Feather name="plus" size={14} color="#F97316" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => handleAgregar(prod)}
                    style={{ backgroundColor: "#F97316", borderRadius: 8, paddingVertical: 7, width: "100%", alignItems: "center" }}
                  >
                    <Feather name="plus" size={15} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
        {listaProductos.length === 0 && (
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
            No hay productos activos.
          </Text>
        )}
      </ScrollView>

      {/* Barra Inferior (Carrito) */}
      {carrito.length > 0 && (
        <View style={{ position: 'absolute', bottom: 104, left: 16, right: 16, borderRadius: 16, overflow: 'hidden' }}>
          <BlurView
            intensity={Platform.OS === "android" ? 65 : 40}
            tint={isDark ? "dark" : "light"}
            style={{
              flexDirection: "row",
              padding: 16,
              gap: 12,
              borderWidth: 0.5,
              borderColor: colors.border,
            }}
          >
            <TouchableOpacity
              onPress={handleCancelarCarrito}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 18,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.textMuted, fontWeight: "500", fontSize: 16 }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalCobro(true)}
              style={{
                flex: 1,
                backgroundColor: "#F97316",
                borderRadius: 10,
                padding: 18,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Cobrar ahora</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}

      {/* Modal Cobro */}
      <Modal visible={modalCobro} transparent animationType="slide" onRequestClose={handleCerrarCobro}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Handle */}
            <View style={{ width: 36, height: 4, backgroundColor: colors.bgInput, borderRadius: 2, alignSelf: "center", marginBottom: 20 }} />

            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 16, textAlign: "center" }}>
              Resumen de Cobro
            </Text>

            <View style={{ maxHeight: 200, marginBottom: 16 }}>
              <ScrollView>
                {carrito.map(item => (
                  <View key={item.productoId} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ color: colors.textLight, fontSize: 13 }}>{item.cantidad}x {item.nombre}</Text>
                    <Text style={{ color: colors.text, fontSize: 13 }}>${(item.cantidad * item.precioUnitario).toFixed(2)}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Sección de Descuento */}
            {!descuentoActivo ? (
              <TouchableOpacity
                onPress={() => setPinDescuento(true)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16, gap: 6 }}
              >
                <Feather name="tag" size={14} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>Aplicar descuento</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "600" }}>Descuento</Text>
                  <TouchableOpacity onPress={() => { setDescuentoActivo(false); setDescuentoValorStr(''); }}>
                    <Feather name="x" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Selector tipo */}
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() => { setDescuentoTipo('monto'); setDescuentoValorStr(''); }}
                    style={{
                      flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5,
                      borderColor: descuentoTipo === 'monto' ? "#F97316" : colors.border,
                      backgroundColor: descuentoTipo === 'monto' ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: descuentoTipo === 'monto' ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "600" }}>Monto ($)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setDescuentoTipo('porcentaje'); setDescuentoValorStr(''); }}
                    style={{
                      flex: 1, padding: 10, borderRadius: 8, borderWidth: 1.5,
                      borderColor: descuentoTipo === 'porcentaje' ? "#F97316" : colors.border,
                      backgroundColor: descuentoTipo === 'porcentaje' ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: descuentoTipo === 'porcentaje' ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "600" }}>Porcentaje (%)</Text>
                  </TouchableOpacity>
                </View>

                {/* Input */}
                <TextInput
                  value={descuentoValorStr}
                  onChangeText={setDescuentoValorStr}
                  keyboardType="numeric"
                  placeholder={descuentoTipo === 'monto' ? 'Monto en $' : 'Porcentaje %'}
                  placeholderTextColor={colors.textMuted}
                  style={{
                    backgroundColor: colors.bgInput, color: colors.text, borderRadius: 8, padding: 12,
                    fontSize: 15, borderWidth: 1, borderColor: errorDescuento ? "#ef4444" : colors.border, marginBottom: 4,
                  }}
                />

                {errorDescuento && (
                  <Text style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>{errorDescuento}</Text>
                )}

                {/* Desglose */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Subtotal</Text>
                  <Text style={{ color: colors.text, fontSize: 13 }}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>Descuento</Text>
                  <Text style={{ color: "#ef4444", fontSize: 13 }}>-${descuentoCalculado.toFixed(2)}</Text>
                </View>
              </View>
            )}

            {/* Total a Pagar */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginBottom: 24 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "500" }}>Total a Pagar</Text>
              <Text style={{ color: "#F97316", fontSize: 18, fontWeight: "bold" }}>
                ${(descuentoActivo ? totalConDescuento : subtotal).toFixed(2)}
              </Text>
            </View>

            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Método de Pago</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setMetodoPago("efectivo")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: metodoPago === "efectivo" ? "#F97316" : colors.border,
                  backgroundColor: metodoPago === "efectivo" ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: metodoPago === "efectivo" ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "600" }}>Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMetodoPago("transferencia")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: metodoPago === "transferencia" ? "#F97316" : colors.border,
                  backgroundColor: metodoPago === "transferencia" ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: metodoPago === "transferencia" ? "#F97316" : colors.textMuted, fontSize: 13, fontWeight: "600" }}>Transferencia</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={handleCerrarCobro}
                disabled={procesando}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.textMuted, fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={confirmarVenta}
                disabled={procesando || !!errorDescuento}
                style={{
                  flex: 1,
                  backgroundColor: procesando ? "#aaa" : "#F97316",
                  padding: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>{procesando ? "Procesando..." : "Confirmar Venta"}</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </Modal>

      {/* Modal Ticket */}
      <TicketModal 
        visible={mostrarTicket}
        datos={ticketDatos}
        onClose={cerrarTicket}
      />

      {showPinModal && (
        <PinModal
          visible={showPinModal}
          titulo="PIN de Supervisor requerido"
          onSuccess={() => {
            setShowPinModal(false);
            ejecutarConfirmarVenta();
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {pinDescuento && (
        <PinModal
          visible={pinDescuento}
          titulo="PIN para aplicar descuento"
          onSuccess={() => {
            setPinDescuento(false);
            setDescuentoActivo(true);
          }}
          onCancel={() => setPinDescuento(false)}
        />
      )}
    </View>
  );
}
