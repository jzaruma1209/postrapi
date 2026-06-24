import { useState, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  getTotalVentasHoy,
  getTopProductosHoy,
} from "../../src/services/ventas.service";
import {
  getTotalGastosHoy,
  getCostoIngredientesHoy,
  getIngredientesStockBajo,
} from "../../src/services/inventario.service";
import { getPedidosActivos } from "../../src/services/pedidos.service";
import { calcularGanancia, formatearGanancia } from "../../src/utils/calculos";
import { db } from "../../src/db";
import { productos } from "../../src/db/schema";
import type { Pedido, Ingrediente } from "../../src/db/schema";
import { useColors, useThemeStore } from "../../src/stores/useThemeStore";

export default function ResumenIndex() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const [cargando, setCargando] = useState(true);

  // Metrics
  const [ventas, setVentas] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [costoIng, setCostoIng] = useState(0);
  
  // Lists
  const [pedidosPendientes, setPedidosPendientes] = useState<Pedido[]>([]);
  const [ingredientesBajos, setIngredientesBajos] = useState<Ingrediente[]>([]);
  const [topProductos, setTopProductos] = useState<{nombre: string, cantidad: number}[]>([]);

  // Current Date Formatting (e.g. "Martes 10 junio")
  const fechaHoyStr = useMemo(() => {
    const fecha = new Date();
    const opciones: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const formateada = fecha.toLocaleDateString('es-ES', opciones);
    return formateada.charAt(0).toUpperCase() + formateada.slice(1);
  }, []);

  const cargarDashboard = async () => {
    try {
      setCargando(true);
      const [
        totalVentas,
        totalGastos,
        costoIngredientes,
        activos,
        bajos,
        topProdIds,
        listaProductos
      ] = await Promise.all([
        getTotalVentasHoy(),
        getTotalGastosHoy(),
        getCostoIngredientesHoy(),
        getPedidosActivos(),
        getIngredientesStockBajo(),
        getTopProductosHoy(3),
        db.select().from(productos)
      ]);

      setVentas(totalVentas);
      setGastos(totalGastos);
      setCostoIng(costoIngredientes);
      setPedidosPendientes(activos);
      setIngredientesBajos(bajos);

      const topMapped = topProdIds.map(tp => {
        const prod = listaProductos.find(p => p.id === tp.productoId);
        return {
          nombre: prod?.nombre ?? "Producto eliminado",
          cantidad: tp.totalVendido
        };
      });
      setTopProductos(topMapped);

    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setCargando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDashboard();
    }, [])
  );

  const ganancia = calcularGanancia(ventas, gastos, costoIng);
  const isGananciaPositiva = ganancia >= 0;

  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#F97316" />
      </View>
    );
  }

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
          <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.text }}>Postrapi</Text>
          <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{fechaHoyStr}</Text>
        </View>
        <TouchableOpacity
          style={{
            width: 40,
            height: 40,
            backgroundColor: colors.bgCard,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: isDark ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          <Feather name="bell" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
        
        {/* Grid de Métricas 2x2 */}
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.bgCard,
              padding: 16,
              borderRadius: 14,
              borderWidth: isDark ? 0.5 : 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>Ventas hoy</Text>
            <Text style={{ color: "#F97316", fontSize: 22, fontWeight: "bold" }}>${ventas.toFixed(2)}</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.bgCard,
              padding: 16,
              borderRadius: 14,
              borderWidth: isDark ? 0.5 : 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>Gastos</Text>
            <Text style={{ color: "#ef4444", fontSize: 22, fontWeight: "bold" }}>${gastos.toFixed(2)}</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.bgCard,
              padding: 16,
              borderRadius: 14,
              borderWidth: isDark ? 0.5 : 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>Ganancia est.</Text>
            <Text style={{ color: isGananciaPositiva ? "#22c55e" : "#ef4444", fontSize: 22, fontWeight: "bold" }}>
              {formatearGanancia(ganancia)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.bgCard,
              padding: 16,
              borderRadius: 14,
              borderWidth: isDark ? 0.5 : 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 8 }}>Pendientes</Text>
            <Text style={{ color: "#38bdf8", fontSize: 22, fontWeight: "bold" }}>{pedidosPendientes.length}</Text>
          </View>
        </View>

        {/* Alertas de Inventario Bajo */}
        {ingredientesBajos.length > 0 && (
          <TouchableOpacity 
            onPress={() => router.push("/(tabs)/bodega")}
            style={{
              backgroundColor: isDark ? "#1a0000" : "#fff5f5",
              padding: 16,
              borderRadius: 14,
              borderLeftWidth: 4,
              borderLeftColor: "#ef4444",
              borderWidth: isDark ? 0 : 1,
              borderColor: "#fecaca",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Feather name="alert-triangle" size={18} color="#ef4444" />
              <Text style={{ color: "#ef4444", fontSize: 15, fontWeight: "bold" }}>Inventario bajo</Text>
            </View>
            <View style={{ gap: 6 }}>
              {ingredientesBajos.slice(0, 3).map(ing => (
                <View key={ing.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: isDark ? "#ffb3b3" : "#dc2626", fontSize: 13 }}>{ing.nombre}</Text>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{ing.stockActual} {ing.unidad}</Text>
                </View>
              ))}
              {ingredientesBajos.length > 3 && (
                <Text style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>+ {ingredientesBajos.length - 3} más...</Text>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Card Pedidos Pendientes */}
        {pedidosPendientes.length > 0 && (
          <TouchableOpacity 
            onPress={() => router.push("/(tabs)/pedidos")}
            style={{
              backgroundColor: colors.bgCard,
              padding: 16,
              borderRadius: 14,
              borderLeftWidth: 4,
              borderLeftColor: "#F97316",
              borderWidth: isDark ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "bold" }}>Pedidos activos</Text>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </View>
            <View style={{ gap: 8 }}>
              {pedidosPendientes.slice(0, 3).map(pedido => (
                <View key={pedido.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.textLight, fontSize: 14 }}>{pedido.clienteNombre || "Sin nombre"}</Text>
                  <View
                    style={{
                      backgroundColor: pedido.estado === "preparando" ? (isDark ? "#1a0d00" : "#fff4e6") : colors.bgInput,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: pedido.estado === "preparando" ? "#F97316" : colors.textMuted, fontSize: 11, textTransform: "capitalize" }}>
                      {pedido.estado}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* Top Hoy */}
        <View
          style={{
            backgroundColor: colors.bgCard,
            padding: 16,
            borderRadius: 14,
            borderWidth: isDark ? 0.5 : 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: "bold", marginBottom: 12 }}>Top hoy</Text>
          {topProductos.length > 0 ? (
            <View style={{ gap: 10 }}>
              {topProductos.map((prod, index) => (
                <View key={index} style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ color: "#F97316", fontSize: 14, fontWeight: "bold", width: 24 }}>{index + 1}.</Text>
                  <Text style={{ color: colors.textLight, fontSize: 14, flex: 1 }}>{prod.nombre}</Text>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>{prod.cantidad} uds</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Aún no hay ventas hoy</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}
