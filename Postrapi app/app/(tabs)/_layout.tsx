import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Dimensions, Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useThemeStore } from "../../src/stores/useThemeStore";
import type { ColorValue, ViewStyle } from "react-native";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface TabIconProps {
  name: FeatherIconName;
  color: ColorValue;
  size?: number;
}

function TabIcon({ name, color, size = 22 }: TabIconProps) {
  return <Feather name={name} size={size} color={color} />;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TAB_BAR_HORIZONTAL = SCREEN_WIDTH * 0.09;

export default function TabsLayout() {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);

  const tabBarStyle: ViewStyle = {
    position: "absolute",
    left: TAB_BAR_HORIZONTAL,
    right: TAB_BAR_HORIZONTAL,
    bottom: 32,
    height: 64,
    borderRadius: 32,
    borderTopWidth: 0,
    backgroundColor: "transparent",
    paddingBottom: 8,
    paddingTop: 8,
    overflow: "hidden",
    ...(Platform.OS === "android"
      ? { elevation: 12 }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        }),
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
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === "android" ? 65 : 40}
            tint={isDark ? "dark" : "light"}
            style={{
              ...StyleSheet.absoluteFill as object,
              borderRadius: 32,
              borderWidth: 0.5,
              borderColor: colors.tabBarBorder,
              overflow: "hidden",
            }}
          />
        ),
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
      <Tabs.Screen name="resumen-cajas" options={{ href: null }} />
      <Tabs.Screen
        name="ventas"
        options={{
          title: "Ventas",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="shopping-cart" color={color} size={size} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate("ventas", { screen: "index" });
          },
        })}
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
