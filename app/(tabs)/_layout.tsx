import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useThemeStore } from "../../src/stores/useThemeStore";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface TabIconProps {
  name: FeatherIconName;
  color: string;
  size?: number;
}

function TabIcon({ name, color, size = 22 }: TabIconProps) {
  return <Feather name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);

  const tabBarStyle = {
    backgroundColor: colors.tabBar,
    borderTopColor: colors.tabBarBorder,
    borderTopWidth: isDark ? 0.5 : 1,
    height: 64,
    paddingBottom: 10,
    paddingTop: 8,
    ...(isDark ? {} : (colors.shadow ?? {})),
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: "#F97316",
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Resumen",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="bar-chart-2" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="ventas"
        options={{
          title: "Ventas",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="shopping-cart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="pedidos"
        options={{
          title: "Pedidos",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="clipboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="bodega"
        options={{
          title: "Bodega",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="archive" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="gastos"
        options={{
          title: "Gastos",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="credit-card" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="gestion"
        options={{
          title: "Gestión",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="settings" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
