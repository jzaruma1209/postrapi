import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ focused, label }: { focused: boolean; label: string }) {
  return (
    <Text
      style={{
        fontSize: 10,
        color: focused ? "#F97316" : "#555555",
        marginTop: 2,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1a1a1a",
          borderTopColor: "#2a2a2a",
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#F97316",
        tabBarInactiveTintColor: "#555555",
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Resumen" }} />
      <Tabs.Screen name="ventas" options={{ title: "Ventas" }} />
      <Tabs.Screen name="pedidos" options={{ title: "Pedidos" }} />
      <Tabs.Screen name="bodega" options={{ title: "Bodega" }} />
      <Tabs.Screen name="gastos" options={{ title: "Gastos" }} />
      <Tabs.Screen name="gestion" options={{ title: "Gestión" }} />
    </Tabs>
  );
}
