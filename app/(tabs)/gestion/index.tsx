import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import PinModal from "../../../src/components/shared/PinModal";
import { hayPinConfigurado } from "../../../src/services/pin.service";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPinModal, setShowPinModal] = useState(true);

  // Cada vez que la pantalla gana foco (se monta), se pide el PIN
  // En Expo Router con tabs, los componentes se montan una vez.
  // Pero setShowPinModal(true) como estado inicial forzará pedirlo.

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setIsAuthenticated(true);
  };

  const handlePinCancel = () => {
    setShowPinModal(false);
    // Si cancela, volvemos a la pestaña anterior (o a Resumen por defecto)
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  if (!isAuthenticated && showPinModal) {
    return (
      <View style={{ flex: 1, backgroundColor: "#141414" }}>
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
    <View style={{ flex: 1, backgroundColor: "#141414" }}>
      {/* Top Bar (implícito, manual) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, backgroundColor: "#141414" }}>
        <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>Gestión</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={0.7}
            onPress={() => router.push(item.route as any)}
            style={{
              backgroundColor: "#1e1e1e",
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: "#2a2a2a",
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Ícono */}
            <View
              style={{
                width: 40,
                height: 40,
                backgroundColor: "#2a2a2a",
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Feather name={item.icon} size={20} color="#F97316" />
            </View>

            {/* Textos */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: "#ffffff", marginBottom: 2 }}>
                {item.title}
              </Text>
              <Text style={{ fontSize: 11, color: "#666" }}>{item.description}</Text>
            </View>

            {/* Chevron */}
            <Feather name="chevron-right" size={20} color="#555" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
