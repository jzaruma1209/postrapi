import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { eq, desc } from "drizzle-orm";
import { db } from "../../../src/db";
import { productos, Producto } from "../../../src/db/schema";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

export default function GestionProductos() {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const router = useRouter();
  const [listaProductos, setListaProductos] = useState<Producto[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  // Form
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [activo, setActivo] = useState(true);

  const cargarProductos = async () => {
    try {
      const data = await db.select().from(productos).orderBy(desc(productos.created_at));
      setListaProductos(data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarProductos();
    }, [])
  );

  const abrirModalNuevo = () => {
    setEditando(null);
    setNombre("");
    setPrecio("");
    setActivo(true);
    setModalVisible(true);
  };

  const abrirModalEditar = (prod: Producto) => {
    setEditando(prod);
    setNombre(prod.nombre);
    setPrecio(prod.precio.toString());
    setActivo(prod.activo === 1);
    setModalVisible(true);
  };

  const guardarProducto = async () => {
    if (!nombre.trim() || !precio.trim() || isNaN(Number(precio))) {
      Alert.alert("Error", "Nombre y precio válidos son requeridos.");
      return;
    }

    try {
      if (editando) {
        await db
          .update(productos)
          .set({
            nombre: nombre.trim(),
            precio: Number(precio),
            activo: activo ? 1 : 0,
            synced: 0,
          })
          .where(eq(productos.id, editando.id));
      } else {
        await db.insert(productos).values({
          id: uuidv4(),
          nombre: nombre.trim(),
          precio: Number(precio),
          activo: activo ? 1 : 0,
          created_at: new Date().toISOString(),
          synced: 0,
        });
      }
      setModalVisible(false);
      cargarProductos();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      Alert.alert("Error", "No se pudo guardar el producto");
    }
  };

  const toggleEstadoRapido = async (prod: Producto) => {
    try {
      const nuevoEstado = prod.activo === 1 ? 0 : 1;
      await db
        .update(productos)
        .set({ activo: nuevoEstado, synced: 0 })
        .where(eq(productos.id, prod.id));
      cargarProductos();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  const mostrarOpciones = (prod: Producto) => {
    Alert.alert(
      "Opciones",
      prod.nombre,
      [
        { text: "Editar", onPress: () => abrirModalEditar(prod) },
        {
          text: prod.activo === 1 ? "Desactivar" : "Activar",
          onPress: () => toggleEstadoRapido(prod),
          style: prod.activo === 1 ? "destructive" : "default",
        },
        { text: "Cancelar", style: "cancel" },
      ],
      { cancelable: true }
    );
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
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="arrow-left" size={20} color={colors.text} />
          <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Productos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={abrirModalNuevo}
          style={{ backgroundColor: "#F97316", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "500" }}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {listaProductos.map((prod) => (
          <View
            key={prod.id}
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: colors.border,
              borderLeftWidth: 3,
              borderLeftColor: prod.activo === 1 ? "#22c55e" : colors.borderLight,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ fontSize: 14, fontWeight: "500", color: colors.text, marginBottom: 4 }}>
                {prod.nombre}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: "500", color: "#F97316" }}>
                  ${prod.precio.toFixed(2)}
                </Text>
                <View
                  style={{
                    backgroundColor: prod.activo === 1 ? (isDark ? "#001a10" : "#e6f7e6") : colors.bgChip,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 10, color: prod.activo === 1 ? "#22c55e" : colors.textMuted, fontWeight: "500" }}>
                    {prod.activo === 1 ? "Activo" : "Inactivo"}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={() => mostrarOpciones(prod)} style={{ padding: 8 }}>
              <Feather name="more-vertical" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        ))}

        {listaProductos.length === 0 && (
          <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 40 }}>
            No hay productos registrados
          </Text>
        )}
      </ScrollView>

      {/* Modal Formulario */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" }}>
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
              {editando ? "Editar Producto" : "Nuevo Producto"}
            </Text>

            <View style={{ gap: 16 }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Nombre</Text>
                <TextInput
                  value={nombre}
                  onChangeText={setNombre}
                  style={{
                    backgroundColor: colors.bgInput,
                    color: colors.text,
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 14,
                  }}
                  placeholderTextColor={colors.textMuted}
                  placeholder="Ej. Hamburguesa Clásica"
                />
              </View>

              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Precio</Text>
                <TextInput
                  value={precio}
                  onChangeText={setPrecio}
                  keyboardType="numeric"
                  style={{
                    backgroundColor: colors.bgInput,
                    color: colors.text,
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 14,
                  }}
                  placeholderTextColor={colors.textMuted}
                  placeholder="Ej. 1500"
                />
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: colors.text, fontSize: 14 }}>Producto Activo</Text>
                <Switch
                  value={activo}
                  onValueChange={setActivo}
                  trackColor={{ false: isDark ? "#555" : "#ccc", true: "#F97316" }}
                  thumbColor="#fff"
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
                onPress={guardarProducto}
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
