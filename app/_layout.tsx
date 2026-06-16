import "../global.css";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { runMigrations } from "../src/db/migrations";
import { runSeeds } from "../src/db/seeds";
import { iniciarSyncAutomatico } from "../src/services/sync.service";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await runMigrations();
      await runSeeds();
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

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#141414", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#F97316" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor="#141414" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
