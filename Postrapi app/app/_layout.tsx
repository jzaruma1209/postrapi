import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator } from "react-native";
import { runMigrations } from "../src/db/migrations";
import { runSeeds } from "../src/db/seeds";
import { iniciarSyncAutomatico } from "../src/services/sync.service";
import { db } from "../src/db";
import { configuracion } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { useThemeStore } from "../src/stores/useThemeStore";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [errorInicio, setErrorInicio] = useState<string | null>(null);
  const isDark = useThemeStore((s) => s.isDark);
  const setDark = useThemeStore((s) => s.setDark);

  useEffect(() => {
    const init = async () => {
      try {
        await runMigrations();
        await runSeeds();
      } catch (e: any) {
        console.error("Error al iniciar la base de datos:", e);
        setErrorInicio(e?.message ?? "Error desconocido");
        return;
      }

      // Cargar tema guardado
      try {
        const rows = await db
          .select()
          .from(configuracion)
          .where(eq(configuracion.clave, "tema"));
        if (rows.length > 0) {
          setDark(rows[0].valor !== "claro");
        }
      } catch (_) {
        // Si falla, quedamos en modo oscuro por defecto
      }

      setReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Sync cada 60 segundos en background
    const stopSync = iniciarSyncAutomatico(60000);
    return () => stopSync();
  }, [ready]);

  if (errorInicio) {
    return (
      <View style={{ flex: 1, backgroundColor: "#141414", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>No se pudo iniciar la base de datos</Text>
        <Text style={{ color: "#a3a3a3", textAlign: "center" }}>{errorInicio}</Text>
        <Text style={{ color: "#a3a3a3", textAlign: "center", marginTop: 12 }}>Cierra y vuelve a abrir la app. Si sigue igual, avisa al soporte.</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#141414", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
