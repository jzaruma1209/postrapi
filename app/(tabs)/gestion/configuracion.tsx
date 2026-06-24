import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { db } from "../../../src/db";
import { configuracion } from "../../../src/db/schema";
import { escanearDispositivos } from "../../../src/services/printer.service";
import { useThemeStore, useColors } from "../../../src/stores/useThemeStore";

const DEFAULT_CONFIG = {
  nombre_negocio: "Mi Negocio",
  moneda: "$",
  stock_minimo_defecto: "10",
  impresora_activa: "0",
  impresora_mac: "",
};

export default function GestionConfiguracion() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const setDark = useThemeStore((s) => s.setDark);

  const [nombreNegocio, setNombreNegocio] = useState("");
  const [moneda, setMoneda] = useState("");
  const [stockMinimo, setStockMinimo] = useState("");
  const [impresoraActiva, setImpresoraActiva] = useState(false);
  const [impresoraMac, setImpresoraMac] = useState("");
  const [escaneando, setEscaneando] = useState(false);
  const [dispositivos, setDispositivos] = useState<{name: string, address: string}[]>([]);

  const cargarConfiguracion = async () => {
    try {
      const resultados = await db.select().from(configuracion);
      const confMap = resultados.reduce((acc, curr) => {
        acc[curr.clave] = curr.valor;
        return acc;
      }, {} as Record<string, string>);

      setNombreNegocio(confMap["nombre_negocio"] ?? DEFAULT_CONFIG.nombre_negocio);
      setMoneda(confMap["moneda"] ?? DEFAULT_CONFIG.moneda);
      setStockMinimo(confMap["stock_minimo_defecto"] ?? DEFAULT_CONFIG.stock_minimo_defecto);
      setImpresoraActiva((confMap["impresora_activa"] ?? DEFAULT_CONFIG.impresora_activa) === "1");
      setImpresoraMac(confMap["impresora_mac"] ?? DEFAULT_CONFIG.impresora_mac);
    } catch (error) {
      console.error("Error al cargar configuración:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarConfiguracion();
    }, [])
  );

  const handleToggleImpresora = (valor: boolean) => {
    setImpresoraActiva(valor);
    if (!valor) {
      setImpresoraMac("");
      setDispositivos([]);
    }
  };

  const handleToggleTema = async (valor: boolean) => {
    // valor = true → modo claro; false → modo oscuro
    const newIsDark = !valor;
    setDark(newIsDark);
    try {
      await db
        .insert(configuracion)
        .values({ clave: "tema", valor: newIsDark ? "oscuro" : "claro" })
        .onConflictDoUpdate({
          target: configuracion.clave,
          set: { valor: newIsDark ? "oscuro" : "claro" },
        });
    } catch (e) {
      console.error("Error guardando tema:", e);
    }
  };

  const handleEscanear = async () => {
    setEscaneando(true);
    const devs = await escanearDispositivos();
    setDispositivos(devs);
    setEscaneando(false);
  };

  const guardarCambios = async () => {
    if (!nombreNegocio.trim() || !moneda.trim() || !stockMinimo.trim() || isNaN(Number(stockMinimo))) {
      Alert.alert("Error", "Revisa los campos. Algunos están vacíos o no son válidos.");
      return;
    }

    try {
      const updates = [
        { clave: "nombre_negocio", valor: nombreNegocio.trim() },
        { clave: "moneda", valor: moneda.trim() },
        { clave: "stock_minimo_defecto", valor: stockMinimo.trim() },
        { clave: "impresora_activa", valor: impresoraActiva ? "1" : "0" },
        { clave: "impresora_mac", valor: impresoraMac.trim() },
      ];

      for (const item of updates) {
        await db
          .insert(configuracion)
          .values(item)
          .onConflictDoUpdate({
            target: configuracion.clave,
            set: { valor: item.valor },
          });
      }

      Alert.alert("Éxito", "Configuración guardada correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      Alert.alert("Error", "No se pudo guardar la configuración.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 16,
          backgroundColor: colors.bg,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="arrow-left" size={20} color={colors.text} />
          <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Configuración</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* ── Sección: Apariencia ─────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: 14,
            padding: 16,
            borderWidth: isDark ? 0.5 : 1,
            borderColor: colors.border,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 14, textTransform: "uppercase" }}>
            Apariencia
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: colors.bgInput,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={isDark ? "moon" : "sun"} size={18} color="#F97316" />
              </View>
              <View>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>
                  {isDark ? "Modo Oscuro" : "Modo Claro"}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  {isDark ? "Activa el modo claro" : "Activa el modo oscuro"}
                </Text>
              </View>
            </View>
            <Switch
              value={!isDark}
              onValueChange={handleToggleTema}
              trackColor={{ false: isDark ? "#555" : "#ccc", true: "#F97316" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Sección: Negocio ────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: 14,
            padding: 16,
            borderWidth: isDark ? 0.5 : 1,
            borderColor: colors.border,
            gap: 16,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Negocio
          </Text>

          <View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Nombre del Negocio</Text>
            <TextInput
              value={nombreNegocio}
              onChangeText={setNombreNegocio}
              style={{
                backgroundColor: colors.bgInput,
                color: colors.text,
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                borderWidth: isDark ? 0 : 1,
                borderColor: colors.border,
              }}
              placeholderTextColor={colors.textMuted}
              placeholder="Ej. Mi Tienda"
            />
          </View>

          <View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Moneda</Text>
            <TextInput
              value={moneda}
              onChangeText={setMoneda}
              style={{
                backgroundColor: colors.bgInput,
                color: colors.text,
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                borderWidth: isDark ? 0 : 1,
                borderColor: colors.border,
              }}
              placeholderTextColor={colors.textMuted}
              placeholder="Ej. $"
            />
          </View>

          <View>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Stock mínimo por defecto</Text>
            <TextInput
              value={stockMinimo}
              onChangeText={setStockMinimo}
              keyboardType="numeric"
              style={{
                backgroundColor: colors.bgInput,
                color: colors.text,
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                borderWidth: isDark ? 0 : 1,
                borderColor: colors.border,
              }}
              placeholderTextColor={colors.textMuted}
              placeholder="Ej. 10"
            />
          </View>
        </View>

        {/* ── Sección: Impresora ──────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: 14,
            padding: 16,
            borderWidth: isDark ? 0.5 : 1,
            borderColor: colors.border,
            gap: 16,
          }}
        >
          <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" }}>
            Impresora
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>Impresora Bluetooth</Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Activar para impresión de tickets</Text>
            </View>
            <Switch
              value={impresoraActiva}
              onValueChange={handleToggleImpresora}
              trackColor={{ false: isDark ? "#555" : "#ccc", true: "#F97316" }}
              thumbColor="#fff"
            />
          </View>

          {impresoraActiva && (
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>MAC Address de la impresora</Text>
                <TextInput
                  value={impresoraMac}
                  onChangeText={setImpresoraMac}
                  style={{
                    backgroundColor: colors.bgInput,
                    color: colors.text,
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 14,
                    textTransform: "uppercase",
                    borderWidth: isDark ? 0 : 1,
                    borderColor: colors.border,
                  }}
                  placeholderTextColor={colors.textMuted}
                  placeholder="00:11:22:33:44:55"
                />
              </View>

              <TouchableOpacity
                onPress={handleEscanear}
                disabled={escaneando}
                style={{
                  backgroundColor: colors.bgInput,
                  padding: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  borderWidth: 1,
                  borderColor: colors.borderLight,
                }}
              >
                {escaneando ? (
                  <ActivityIndicator size="small" color="#F97316" />
                ) : (
                  <Feather name="bluetooth" size={16} color="#F97316" />
                )}
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>
                  {escaneando ? "Buscando..." : "Buscar dispositivos"}
                </Text>
              </TouchableOpacity>

              {dispositivos.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>Dispositivos encontrados:</Text>
                  {dispositivos.map((dev) => (
                    <TouchableOpacity
                      key={dev.address}
                      onPress={() => setImpresoraMac(dev.address)}
                      style={{
                        backgroundColor: impresoraMac === dev.address ? (isDark ? "#2a1a00" : "#fff4e6") : colors.bgInput,
                        padding: 12,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: impresoraMac === dev.address ? "#F97316" : colors.borderLight,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500" }}>{dev.name || "Desconocido"}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{dev.address}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={guardarCambios}
          style={{
            backgroundColor: "#F97316",
            padding: 14,
            borderRadius: 10,
            alignItems: "center",
            marginTop: 8,
            marginBottom: 24,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Guardar cambios</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
