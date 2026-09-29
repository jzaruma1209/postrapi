import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors, useThemeStore } from "../../../src/stores/useThemeStore";
import {
  sincronizar,
  contarPendientes,
  obtenerUltimosSyncLogs,
} from "../../../src/services/sync.service";
import type { syncLog } from "../../../src/db/schema";

type SyncLogRow = typeof syncLog.$inferSelect;
type EstadoTabla = {
  nombre: string;
  ultimoLog: SyncLogRow | null;
  pendientes: number;
};

const SYNC_TABLE_NAMES = [
  "productos",
  "ingredientes",
  "recetas",
  "pedidos",
  "pedido_items",
  "ventas",
  "venta_items",
  "movimientos_inventario",
  "compras",
  "gastos",
  "caja_diaria",
] as const;

export default function GestionRespaldo() {
  const router = useRouter();
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const [tablas, setTablas] = useState<EstadoTabla[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [ultimoIntentoGlobal, setUltimoIntentoGlobal] = useState<string | null>(
    null
  );

  const cargarEstado = async () => {
    try {
      const [logs, pendientes] = await Promise.all([
        obtenerUltimosSyncLogs(),
        contarPendientes(),
      ]);

      const filas: EstadoTabla[] = SYNC_TABLE_NAMES.map((name) => ({
        nombre: name.replace(/_/g, " "),
        ultimoLog: logs[name] ?? null,
        pendientes: pendientes[name] ?? 0,
      }));

      setTablas(filas);

      const masReciente = filas.reduce<string | null>((acc, t) => {
        if (!t.ultimoLog) return acc;
        return !acc || t.ultimoLog.createdAt > acc
          ? t.ultimoLog.createdAt
          : acc;
      }, null);
      setUltimoIntentoGlobal(masReciente);
    } catch (e) {
      console.error("Error cargando estado de sync:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarEstado();
    }, [])
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      await sincronizar();
      await cargarEstado();
    } catch (e) {
      console.error("Error en sync manual:", e);
    } finally {
      setSyncing(false);
    }
  };

  const formatearFecha = (iso: string | null) => {
    if (!iso) return "Sin fecha";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Fecha inválida";
    return d.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
          <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>
            Respaldo
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Botón Sincronizar */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSync}
          disabled={syncing}
          style={{
            backgroundColor: "#F97316",
            padding: 14,
            borderRadius: 10,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: syncing ? 0.7 : 1,
          }}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="upload-cloud" size={18} color="#fff" />
          )}
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
            {syncing ? "Sincronizando..." : "Sincronizar ahora"}
          </Text>
        </TouchableOpacity>

        {/* Último intento global */}
        {ultimoIntentoGlobal && (
          <View
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 14,
              padding: 14,
              borderWidth: isDark ? 0.5 : 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                fontWeight: "600",
                letterSpacing: 0.5,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Último intento
            </Text>
            <Text style={{ color: colors.text, fontSize: 14 }}>
              {formatearFecha(ultimoIntentoGlobal)}
            </Text>
          </View>
        )}

        {/* Lista por tabla */}
        <View
          style={{
            backgroundColor: colors.bgCard,
            borderRadius: 14,
            borderWidth: isDark ? 0.5 : 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 10,
            }}
          >
            <Text
              style={{
                color: colors.textMuted,
                fontSize: 11,
                fontWeight: "600",
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              Tablas
            </Text>
          </View>

          {tablas.map((t, i) => (
            <View
              key={t.nombre}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderTopWidth: i > 0 ? 0.5 : 0,
                borderTopColor: colors.border,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "500",
                    color: colors.text,
                    flex: 1,
                  }}
                >
                  {t.nombre}
                </Text>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  {/* Pendientes badge */}
                  {t.pendientes > 0 && (
                    <View
                      style={{
                        backgroundColor: isDark ? "#3b1a1a" : "#fef2f2",
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: "#ef4444",
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        {t.pendientes} pend.
                      </Text>
                    </View>
                  )}

                  {/* Estado último intento */}
                  {!t.ultimoLog ? (
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: 11,
                        fontStyle: "italic",
                      }}
                    >
                      Nunca sync
                    </Text>
                  ) : t.ultimoLog.estado === "exitoso" ? (
                    <Feather name="check-circle" size={18} color="#22c55e" />
                  ) : (
                    <Feather name="x-circle" size={18} color="#ef4444" />
                  )}
                </View>
              </View>

              {/* Error message y detalle */}
              {t.ultimoLog?.estado === "fallido" && t.ultimoLog.errorMensaje && (
                <Text
                  style={{
                    color: "#ef4444",
                    fontSize: 11,
                    marginTop: 4,
                    lineHeight: 16,
                  }}
                >
                  {t.ultimoLog.errorMensaje}
                </Text>
              )}

              {t.ultimoLog && (
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  {formatearFecha(t.ultimoLog.createdAt)}
                  {t.ultimoLog.estado === "exitoso" &&
                    ` — ${t.ultimoLog.registros} registros`}
                </Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
