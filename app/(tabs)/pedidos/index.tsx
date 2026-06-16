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
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { db } from "../../../src/db";
import { productos, Producto, Pedido } from "../../../src/db/schema";
import {
  getPedidosHoy,
  getPedidoItems,
  crearPedido,
  cambiarEstadoPedido,
  entregarPedido,
  ItemPedido,
} from "../../../src/services/pedidos.service";
import type { OrigenPedido, MetodoPago, EstadoPedido } from "../../../src/utils/types";

type PedidoCompleto = Pedido & {
  resumenItems: string;
};

export default function PedidosIndex() {
  const router = useRouter();
  
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

  // Cobro Modal
  const [modalCobro, setModalCobro] = useState(false);
  const [pedidoACobrar, setPedidoACobrar] = useState<string | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("efectivo");

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
          return {
            ...ped,
            resumenItems: nombres.join(" · "),
          };
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
      case "pendiente": return "#F97316"; // naranja
      case "preparando": return "#38bdf8"; // azul
      case "entregado": return "#22c55e"; // verde
      default: return "#888";
    }
  };

  const getBgEstado = (est: string) => {
    switch (est) {
      case "pendiente": return "#2a1a00";
      case "preparando": return "#001a2a";
      case "entregado": return "#001a10";
      default: return "#2a2a2a";
    }
  };

  // ─── ACCIONES DE LISTA ───

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
      await entregarPedido(pedidoACobrar, metodoPago);
      setModalCobro(false);
      setPedidoACobrar(null);
      cargarPedidos();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "No se pudo entregar y cobrar el pedido.");
    } finally {
      setProcesando(false);
    }
  };

  // ─── NUEVO PEDIDO ───

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

  const getCantEnCarrito = (id: string) => {
    return carritoNuevo.find(i => i.productoId === id)?.cantidad || 0;
  };

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
      console.error(err);
      Alert.alert("Error", "No se pudo crear el pedido.");
    } finally {
      setProcesando(false);
    }
  };

  const pedidosFiltrados = pedidosLista.filter(p => filtro === "todos" || p.estado === filtro);

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
        <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>Pedidos</Text>
        <TouchableOpacity
          onPress={() => setModalNuevo(true)}
          style={{ backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>+ Nuevo</Text>
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
                backgroundColor: filtro === f ? "#F97316" : "#2a2a2a",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                borderWidth: 0.5,
                borderColor: filtro === f ? "#F97316" : "#333",
              }}
            >
              <Text style={{ color: filtro === f ? "#fff" : "#888", fontSize: 11, fontWeight: filtro === f ? "500" : "400", textTransform: "capitalize" }}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de Pedidos */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {pedidosFiltrados.map(ped => (
          <View
            key={ped.id}
            style={{
              backgroundColor: "#1e1e1e",
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: "#2a2a2a",
              borderLeftWidth: 3,
              borderLeftColor: getColorEstado(ped.estado),
              padding: 16,
              gap: 8,
              opacity: ped.estado === "entregado" ? 0.6 : 1,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Feather name={getIconoOrigen(ped.origen)} size={14} color="#888" />
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>
                  {ped.clienteNombre || "Sin nombre"}
                </Text>
              </View>
              <View style={{ backgroundColor: getBgEstado(ped.estado), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ color: getColorEstado(ped.estado), fontSize: 10, fontWeight: "500", textTransform: "capitalize" }}>
                  {ped.estado}
                </Text>
              </View>
            </View>

            <Text style={{ color: "#ccc", fontSize: 12, lineHeight: 18 }}>
              {ped.resumenItems}
            </Text>

            {!!ped.nota && (
              <Text style={{ color: "#888", fontSize: 11, fontStyle: "italic" }}>
                Nota: {ped.nota}
              </Text>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: "#666", fontSize: 11 }}>
                {new Date(ped.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>

              {ped.estado === "pendiente" && (
                <TouchableOpacity
                  onPress={() => handlePreparando(ped.id)}
                  style={{ backgroundColor: "#38bdf8", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>Preparando</Text>
                </TouchableOpacity>
              )}

              {ped.estado === "preparando" && (
                <TouchableOpacity
                  onPress={() => abrirCobro(ped.id)}
                  style={{ backgroundColor: "#22c55e", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                >
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "500" }}>Entregar y cobrar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {pedidosFiltrados.length === 0 && (
          <Text style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
            No hay pedidos en este estado hoy.
          </Text>
        )}
      </ScrollView>

      {/* Modal Nuevo Pedido */}
      <Modal visible={modalNuevo} transparent animationType="slide" onRequestClose={() => setModalNuevo(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#1e1e1e", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, height: "85%" }}>
            <Text style={{ fontSize: 18, fontWeight: "500", color: "#fff", marginBottom: 16 }}>Nuevo Pedido</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Formulario */}
              <View style={{ gap: 12, marginBottom: 16 }}>
                <TextInput
                  value={clienteNombre}
                  onChangeText={setClienteNombre}
                  placeholder="Nombre del cliente (opcional)"
                  placeholderTextColor="#666"
                  style={{ backgroundColor: "#2a2a2a", color: "#fff", padding: 12, borderRadius: 10, fontSize: 14 }}
                />
                <TextInput
                  value={nota}
                  onChangeText={setNota}
                  placeholder="Nota (opcional)"
                  placeholderTextColor="#666"
                  style={{ backgroundColor: "#2a2a2a", color: "#fff", padding: 12, borderRadius: 10, fontSize: 14 }}
                />
              </View>

              <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Origen</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                {(["en_persona", "whatsapp", "llamada"] as const).map(ori => (
                  <TouchableOpacity
                    key={ori}
                    onPress={() => setOrigen(ori)}
                    style={{ flex: 1, alignItems: "center", padding: 10, borderRadius: 10, backgroundColor: origen === ori ? "#2a1a00" : "#2a2a2a", borderWidth: 1, borderColor: origen === ori ? "#F97316" : "#333" }}
                  >
                    <Feather name={getIconoOrigen(ori)} size={16} color={origen === ori ? "#F97316" : "#888"} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Productos del Menú</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginBottom: 24 }}>
                {listaProductos.map(prod => {
                  const qty = getCantEnCarrito(prod.id);
                  return (
                    <View key={prod.id} style={{ width: "48%", backgroundColor: "#2a2a2a", borderRadius: 10, padding: 12, alignItems: "center" }}>
                      <Text style={{ color: "#ccc", fontSize: 12, textAlign: "center", marginBottom: 4 }} numberOfLines={1}>{prod.nombre}</Text>
                      <Text style={{ color: "#F97316", fontSize: 13, fontWeight: "bold", marginBottom: 12 }}>${prod.precio.toFixed(2)}</Text>
                      {qty > 0 ? (
                        <View style={{ flexDirection: "row", alignItems: "center", width: "100%", justifyContent: "space-between", borderWidth: 0.5, borderColor: "#F97316", borderRadius: 6 }}>
                          <TouchableOpacity onPress={() => handleRestarDelCarrito(prod.id)} style={{ padding: 6 }}><Feather name="minus" size={14} color="#F97316" /></TouchableOpacity>
                          <Text style={{ color: "#fff", fontSize: 12 }}>{qty}</Text>
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
              <TouchableOpacity onPress={() => setModalNuevo(false)} disabled={procesando} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#555", alignItems: "center" }}>
                <Text style={{ color: "#ccc", fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarCrearPedido} disabled={procesando} style={{ flex: 1, backgroundColor: procesando ? "#888" : "#F97316", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "500" }}>{procesando ? "Creando..." : "Crear Pedido"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cobro (al Entregar) */}
      <Modal visible={modalCobro} transparent animationType="fade" onRequestClose={() => setModalCobro(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: "#1e1e1e", width: "100%", borderRadius: 20, padding: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: "500", color: "#fff", marginBottom: 16, textAlign: "center" }}>
              Entregar y Cobrar
            </Text>

            <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Método de Pago</Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <TouchableOpacity
                onPress={() => setMetodoPago("efectivo")}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: metodoPago === "efectivo" ? "#F97316" : "#333", backgroundColor: metodoPago === "efectivo" ? "#2a1a00" : "#2a2a2a", alignItems: "center" }}
              >
                <Text style={{ color: metodoPago === "efectivo" ? "#F97316" : "#ccc", fontSize: 13, fontWeight: "500" }}>Efectivo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setMetodoPago("transferencia")}
                style={{ flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: metodoPago === "transferencia" ? "#F97316" : "#333", backgroundColor: metodoPago === "transferencia" ? "#2a1a00" : "#2a2a2a", alignItems: "center" }}
              >
                <Text style={{ color: metodoPago === "transferencia" ? "#F97316" : "#ccc", fontSize: 13, fontWeight: "500" }}>Transferencia</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity onPress={() => setModalCobro(false)} disabled={procesando} style={{ flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: "#555", alignItems: "center" }}>
                <Text style={{ color: "#ccc", fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmarCobro} disabled={procesando} style={{ flex: 1, backgroundColor: procesando ? "#888" : "#22c55e", padding: 14, borderRadius: 10, alignItems: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "500" }}>{procesando ? "Procesando..." : "Confirmar"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
