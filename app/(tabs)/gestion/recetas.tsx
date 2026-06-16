import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { v4 as uuidv4 } from "uuid";
import { eq, and } from "drizzle-orm";
import { db } from "../../../src/db";
import { productos, ingredientes, recetas, Producto, Ingrediente, Receta } from "../../../src/db/schema";

type RecetaConIngrediente = Receta & { ingredienteNombre: string; ingredienteUnidad: string };

export default function GestionRecetas() {
  const router = useRouter();
  
  const [listaProductos, setListaProductos] = useState<Producto[]>([]);
  const [listaIngredientes, setListaIngredientes] = useState<Ingrediente[]>([]);
  const [recetasVinculadas, setRecetasVinculadas] = useState<Record<string, RecetaConIngrediente[]>>({});
  const [productoExpandido, setProductoExpandido] = useState<string | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [productoActual, setProductoActual] = useState<Producto | null>(null);
  const [ingredienteSeleccionado, setIngredienteSeleccionado] = useState<string>("");
  const [cantidad, setCantidad] = useState("");

  const cargarDatos = async () => {
    try {
      // Cargar productos activos
      const prods = await db.select().from(productos).where(eq(productos.activo, 1));
      setListaProductos(prods);

      // Cargar ingredientes disponibles
      const ings = await db.select().from(ingredientes);
      setListaIngredientes(ings);

      // Cargar recetas vinculadas
      const recs = await db
        .select({
          id: recetas.id,
          productoId: recetas.productoId,
          ingredienteId: recetas.ingredienteId,
          cantidad: recetas.cantidad,
          createdAt: recetas.createdAt,
          synced: recetas.synced,
          ingredienteNombre: ingredientes.nombre,
          ingredienteUnidad: ingredientes.unidad,
        })
        .from(recetas)
        .innerJoin(ingredientes, eq(recetas.ingredienteId, ingredientes.id));

      const agrupadas: Record<string, RecetaConIngrediente[]> = {};
      recs.forEach((r) => {
        if (!agrupadas[r.productoId]) agrupadas[r.productoId] = [];
        agrupadas[r.productoId].push(r as RecetaConIngrediente);
      });
      setRecetasVinculadas(agrupadas);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const toggleProducto = (id: string) => {
    setProductoExpandido(prev => (prev === id ? null : id));
  };

  const abrirModalAgregar = (prod: Producto) => {
    setProductoActual(prod);
    setIngredienteSeleccionado(listaIngredientes.length > 0 ? listaIngredientes[0].id : "");
    setCantidad("");
    setModalVisible(true);
  };

  const guardarReceta = async () => {
    if (!productoActual || !ingredienteSeleccionado || !cantidad || isNaN(Number(cantidad))) {
      Alert.alert("Error", "Debe seleccionar un ingrediente y proveer una cantidad válida.");
      return;
    }

    try {
      await db.insert(recetas).values({
        id: uuidv4(),
        productoId: productoActual.id,
        ingredienteId: ingredienteSeleccionado,
        cantidad: Number(cantidad),
        createdAt: new Date().toISOString(),
        synced: 0,
      });
      setModalVisible(false);
      cargarDatos();
    } catch (error) {
      console.error("Error al guardar receta:", error);
      Alert.alert("Error", "No se pudo guardar.");
    }
  };

  const eliminarReceta = (id: string) => {
    Alert.alert("Eliminar", "¿Seguro que deseas desvincular este ingrediente?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await db.delete(recetas).where(eq(recetas.id, id));
            cargarDatos();
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  const ingredienteInfo = listaIngredientes.find(i => i.id === ingredienteSeleccionado);

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
          <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>Recetas</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {listaProductos.map((prod) => {
          const expandido = productoExpandido === prod.id;
          const ingredientesProd = recetasVinculadas[prod.id] || [];

          return (
            <View
              key={prod.id}
              style={{
                backgroundColor: "#1e1e1e",
                borderRadius: 14,
                borderWidth: 0.5,
                borderColor: "#2a2a2a",
                overflow: "hidden",
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleProducto(prod.id)}
                style={{
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: "#fff" }}>
                    {prod.nombre}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                    {ingredientesProd.length} ingredientes vinculados
                  </Text>
                </View>
                <Feather name={expandido ? "chevron-up" : "chevron-down"} size={20} color="#888" />
              </TouchableOpacity>

              {expandido && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                  <View style={{ height: 1, backgroundColor: "#2a2a2a", marginBottom: 8 }} />
                  
                  {ingredientesProd.map((r) => (
                    <View key={r.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#2a2a2a", padding: 10, borderRadius: 8 }}>
                      <View>
                        <Text style={{ fontSize: 13, color: "#fff" }}>{r.ingredienteNombre}</Text>
                        <Text style={{ fontSize: 11, color: "#F97316", fontWeight: "500" }}>
                          {r.cantidad} {r.ingredienteUnidad}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => eliminarReceta(r.id)} style={{ padding: 4 }}>
                        <Feather name="trash-2" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    onPress={() => abrirModalAgregar(prod)}
                    style={{
                      marginTop: 8,
                      borderWidth: 1,
                      borderColor: "#F97316",
                      borderRadius: 10,
                      padding: 10,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#F97316", fontSize: 12, fontWeight: "500" }}>+ Agregar ingrediente</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {listaProductos.length === 0 && (
          <Text style={{ color: "#888", textAlign: "center", marginTop: 40 }}>
            No hay productos activos para vincular.
          </Text>
        )}
      </ScrollView>

      {/* Modal Formulario */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#1e1e1e",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              minHeight: 400,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "500", color: "#fff", marginBottom: 20 }}>
              Vincular Ingrediente
            </Text>

            <View style={{ gap: 16 }}>
              {/* Selector Custom Simple (ScrollView con TouchableOpacity) */}
              <View>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Selecciona Ingrediente</Text>
                <View style={{ height: 120, backgroundColor: "#2a2a2a", borderRadius: 10, overflow: "hidden" }}>
                  <ScrollView nestedScrollEnabled>
                    {listaIngredientes.map(ing => (
                      <TouchableOpacity
                        key={ing.id}
                        onPress={() => setIngredienteSeleccionado(ing.id)}
                        style={{
                          padding: 12,
                          backgroundColor: ingredienteSeleccionado === ing.id ? "#F97316" : "transparent",
                          borderBottomWidth: 1,
                          borderBottomColor: "#333",
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 14 }}>{ing.nombre} ({ing.unidad})</Text>
                      </TouchableOpacity>
                    ))}
                    {listaIngredientes.length === 0 && (
                      <Text style={{ color: "#888", padding: 12 }}>No hay ingredientes registrados.</Text>
                    )}
                  </ScrollView>
                </View>
              </View>

              <View>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>
                  Cantidad {ingredienteInfo ? `(en ${ingredienteInfo.unidad})` : ""}
                </Text>
                <TextInput
                  value={cantidad}
                  onChangeText={setCantidad}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: "#2a2a2a",
                    color: "#fff",
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 14,
                  }}
                  placeholderTextColor="#666"
                  placeholder="Ej. 1.5"
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginTop: 32 }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: "#555",
                  padding: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#ccc", fontWeight: "500" }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={guardarReceta}
                style={{
                  flex: 1,
                  backgroundColor: "#F97316",
                  padding: 14,
                  borderRadius: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "500" }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
