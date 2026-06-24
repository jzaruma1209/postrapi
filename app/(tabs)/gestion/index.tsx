import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import PinModal from "../../../src/components/shared/PinModal";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";

const MENU_ITEMS = [
  {
    id: "productos",
    title: "Productos",
    description: "Crear y editar productos del menú",
    icon: "shopping-bag",
    route: "/gestion/productos",
  },
  {
    id: "recetas",
    title: "Recetas",
    description: "Vincular ingredientes a productos",
    icon: "bookmark",
    route: "/gestion/recetas",
  },
  {
    id: "pin",
    title: "PIN y Acceso",
    description: "Cambiar PIN de supervisor",
    icon: "lock",
    route: "/gestion/pin",
  },
  {
    id: "configuracion",
    title: "Configuración",
    description: "Nombre del negocio y preferencias",
    icon: "settings",
    route: "/gestion/configuracion",
  },
] as const;

export default function GestionIndex() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(true);

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setIsAuthenticated(true);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  if (!isAuthenticated && showPinModal) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <PinModal
          visible={showPinModal}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
          titulo="PIN de Supervisor"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 16,
          backgroundColor: colors.bg,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: "700", color: colors.text }}>Gestión</Text>
        <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>Administra tu negocio</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => router.push(item.route as any)}
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 14,
              borderWidth: isDark ? 0.5 : 1,
              borderColor: colors.border,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Ícono */}
            <View
              style={{
                width: 44,
                height: 44,
                backgroundColor: isDark ? "#2a1a00" : "#fff4e6",
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: isDark ? 0 : 1,
                borderColor: "#F9731620",
              }}
            >
              <Feather name={item.icon} size={20} color="#F97316" />
            </View>

            {/* Textos */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 2 }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{item.description}</Text>
            </View>

            {/* Chevron */}
            <Feather name="chevron-right" size={18} color={colors.tabInactive} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
