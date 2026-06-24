import { create } from "zustand";
import type { ViewStyle } from "react-native";

// ─── Color Tokens ─────────────────────────────────────────────────────────────

export interface ThemeColors {
  bg: string;
  bgCard: string;
  bgInput: string;
  bgChip: string;
  bgIconBox: string;
  border: string;
  borderLight: string;
  text: string;
  textMuted: string;
  textLight: string;
  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  accent: string;
  danger: string;
  success: string;
  info: string;
  overlay: string;
  shadow: ViewStyle | undefined;
}

export const DARK_COLORS: ThemeColors = {
  bg: "#141414",
  bgCard: "#1e1e1e",
  bgInput: "#2a2a2a",
  bgChip: "#2a2a2a",
  bgIconBox: "#2a2a2a",
  border: "#2a2a2a",
  borderLight: "#333",
  text: "#ffffff",
  textMuted: "#888888",
  textLight: "#cccccc",
  tabBar: "#1a1a1a",
  tabBarBorder: "#2a2a2a",
  tabInactive: "#555555",
  accent: "#F97316",
  danger: "#ef4444",
  success: "#22c55e",
  info: "#38bdf8",
  overlay: "rgba(0,0,0,0.85)",
  shadow: undefined,
};

export const LIGHT_COLORS: ThemeColors = {
  bg: "#f5f5f5",
  bgCard: "#ffffff",
  bgInput: "#f0f0f0",
  bgChip: "#f0f0f0",
  bgIconBox: "#f0f0f0",
  border: "#e5e5e5",
  borderLight: "#e0e0e0",
  text: "#111111",
  textMuted: "#777777",
  textLight: "#444444",
  tabBar: "#ffffff",
  tabBarBorder: "#e5e5e5",
  tabInactive: "#999999",
  accent: "#F97316",
  danger: "#ef4444",
  success: "#22c55e",
  info: "#0284c7",
  overlay: "rgba(0,0,0,0.5)",
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
};

// ─── Store ────────────────────────────────────────────────────────────────────

interface ThemeState {
  isDark: boolean;
  colors: ThemeColors;
  setDark: (dark: boolean) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: true,
  colors: DARK_COLORS,

  setDark: (dark: boolean) => {
    set({ isDark: dark, colors: dark ? DARK_COLORS : LIGHT_COLORS });
  },

  toggleTheme: () => {
    const nextDark = !get().isDark;
    set({ isDark: nextDark, colors: nextDark ? DARK_COLORS : LIGHT_COLORS });
  },
}));

// ─── Convenience hook ─────────────────────────────────────────────────────────

export const useColors = () => useThemeStore((s) => s.colors);
