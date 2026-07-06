import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { generateId } from "../../../src/utils/uuid";
import { parseNumber } from "../../../src/utils/numbers";
import { eq, and } from "drizzle-orm";
import { db } from "../../../src/db";
import { productos, ingredientes, recetas, Producto, Ingrediente, Receta } from "../../../src/db/schema";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

type RecetaConIngrediente = Receta & { ingredienteNombre: string; ingredienteUnidad: string };

export default function GestionRecetas() {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
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
          created_at: recetas.created_at,
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
    if (!productoActual || !ingredienteSeleccionado || !cantidad || isNaN(parseNumber(cantidad))) {
      Alert.alert("Error", "Debe seleccionar un ingrediente y proveer una cantidad válida.");
      return;
    }

    try {
      await db.insert(recetas).values({
        id: generateId(),
        productoId: productoActual.id,
        ingredienteId: ingredienteSeleccionado,
        cantidad: parseNumber(cantidad),
        created_at: new Date().toISOString(),
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
          <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Recetas</Text>
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
                backgroundColor: colors.bgCard,
                borderRadius: 14,
                borderWidth: 0.5,
                borderColor: colors.border,
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
                  <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text }}>
                    {prod.nombre}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    {ingredientesProd.length} ingredientes vinculados
                  </Text>
                </View>
                <Feather name={expandido ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {expandido && (
                <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
                  <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 8 }} />
                  
                  {ingredientesProd.map((r) => (
                    <View key={r.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.bgChip, padding: 10, borderRadius: 8 }}>
                      <View>
                        <Text style={{ fontSize: 13, color: colors.text }}>{r.ingredienteNombre}</Text>
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
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
            No hay productos activos para vincular.
          </Text>
        )}
      </ScrollView>

      {/* Modal Formulario */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View
              style={{
                backgroundColor: colors.bgCard,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: 24,
                minHeight: 400,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "500", color: colors.text, marginBottom: 20 }}>
                Vincular Ingrediente
              </Text>

              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={{ gap: 16 }}>
                  {/* Selector Custom Simple (ScrollView con TouchableOpacity) */}
                  <View>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Selecciona Ingrediente</Text>
                    <View style={{ height: 120, backgroundColor: colors.bgInput, borderRadius: 10, overflow: "hidden" }}>
                      <ScrollView nestedScrollEnabled>
                        {listaIngredientes.map(ing => (
                          <TouchableOpacity
                            key={ing.id}
                            onPress={() => setIngredienteSeleccionado(ing.id)}
                            style={{
                              padding: 12,
                              backgroundColor: ingredienteSeleccionado === ing.id ? "#F97316" : "transparent",
                              borderBottomWidth: 1,
                              borderBottomColor: colors.borderLight,
                            }}
                          >
                            <Text style={{ color: ingredienteSeleccionado === ing.id ? "#fff" : colors.text, fontSize: 14 }}>{ing.nombre} ({ing.unidad})</Text>
                          </TouchableOpacity>
                        ))}
                        {listaIngredientes.length === 0 && (
                          <Text style={{ color: colors.textMuted, padding: 12 }}>No hay ingredientes registrados.</Text>
                        )}
                      </ScrollView>
                    </View>
                  </View>

                  <View>
                    <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>
                      Cantidad {ingredienteInfo ? `(en ${ingredienteInfo.unidad})` : ""}
                    </Text>
                    <TextInput
                      value={cantidad}
                      onChangeText={setCantidad}
                      keyboardType="numeric"
                      style={{
                        backgroundColor: colors.bgInput,
                        color: colors.text,
                        borderRadius: 10,
                        padding: 12,
                        fontSize: 14,
                      }}
                      placeholderTextColor={colors.textMuted}
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
                      borderColor: colors.borderLight,
                      padding: 14,
                      borderRadius: 10,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.textLight, fontWeight: "500" }}>Cancelar</Text>
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
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
