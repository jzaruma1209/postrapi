import { useState, useMemo } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Vibration, TextInput, Alert
} from "react-native";
import { verificarPin, esPinDefault, cambiarPin } from "../../services/pin.service";
import { generarCodigoRecuperacion } from "../../utils/pinRecovery";
import { useColors, useThemeStore } from "../../stores/useThemeStore";

interface PinModalProps {
  visible: boolean;
  titulo?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export default function PinModal({
  visible,
  titulo = "Ingresa el PIN",
  onSuccess,
  onCancel,
}: PinModalProps) {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [verificando, setVerificando] = useState(false);
  
  // Fases: "pin" | "advertencia" | "recuperar" | "setNuevoPin" | "confirmarNuevoPin"
  const [fase, setFase] = useState<"pin" | "advertencia" | "recuperar" | "setNuevoPin" | "confirmarNuevoPin">("pin");
  
  // Recovery States
  const [intentosFallidos, setIntentosFallidos] = useState(0);
  const [codigoRecuperacion, setCodigoRecuperacion] = useState("");
  const [errorRecuperacion, setErrorRecuperacion] = useState("");
  const [nuevoPin, setNuevoPin] = useState("");

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const fechaHoyStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  const handleTecla = async (tecla: string) => {
    if (verificando || fase === "advertencia" || fase === "recuperar") return;

    if (tecla === "⌫") {
      setPin((prev) => prev.slice(0, -1));
      setError(false);
      return;
    }

    if (tecla === "") return;

    const nuevoValor = pin + tecla;
    setPin(nuevoValor);
    setError(false);

    if (fase === "pin") {
      if (nuevoValor.length === 4) {
        setVerificando(true);
        const ok = await verificarPin(nuevoValor);
        setVerificando(false);

        if (ok) {
          setPin("");
          setError(false);
          setIntentosFallidos(0);
          if (esPinDefault(nuevoValor)) {
            setFase("advertencia");
          } else {
            onSuccess();
          }
        } else {
          Vibration.vibrate(300);
          setError(true);
          setIntentosFallidos((prev) => prev + 1);
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 800);
        }
      }
    } else if (fase === "setNuevoPin") {
      if (nuevoValor.length === 4) {
        setNuevoPin(nuevoValor);
        setPin("");
        setFase("confirmarNuevoPin");
      }
    } else if (fase === "confirmarNuevoPin") {
      if (nuevoValor.length === 4) {
        if (nuevoValor === nuevoPin) {
          setVerificando(true);
          try {
            await cambiarPin(nuevoValor);
            setVerificando(false);
            setIntentosFallidos(0);
            Alert.alert("Éxito", "PIN actualizado correctamente.", [
              {
                text: "OK",
                onPress: () => {
                  setPin("");
                  setNuevoPin("");
                  setFase("pin");
                  onSuccess();
                },
              },
            ]);
          } catch (err) {
            setVerificando(false);
            Alert.alert("Error", "No se pudo actualizar el PIN.");
          }
        } else {
          Vibration.vibrate(300);
          setError(true);
          setTimeout(() => {
            setPin("");
            setError(false);
            setFase("setNuevoPin");
            setNuevoPin("");
          }, 800);
        }
      }
    }
  };

  const handleVerificarCodigo = () => {
    if (codigoRecuperacion.length !== 6) {
      setErrorRecuperacion("El código debe tener 6 dígitos.");
      return;
    }

    const correcto = generarCodigoRecuperacion(new Date());
    if (codigoRecuperacion === correcto) {
      setErrorRecuperacion("");
      setPin("");
      setCodigoRecuperacion("");
      setFase("setNuevoPin");
    } else {
      Vibration.vibrate(300);
      setErrorRecuperacion("Código incorrecto");
    }
  };

  const handleEntendido = () => {
    setFase("pin");
    onSuccess();
  };

  const handleCancel = () => {
    setPin("");
    setError(false);
    setFase("pin");
    setIntentosFallidos(0);
    setCodigoRecuperacion("");
    setNuevoPin("");
    setErrorRecuperacion("");
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>

          {/* ── FASE: ADVERTENCIA ── */}
          {fase === "advertencia" ? (
            <>
              <View style={styles.iconoCirculo}>
                <Text style={styles.iconoEmoji}>🔒</Text>
              </View>

              <Text style={styles.advertenciaTitulo}>PIN por defecto activo</Text>

              <View style={styles.warningBoxGrande}>
                <Text style={styles.warningTextoGrande}>
                  Debes cambiar el PIN por seguridad
                </Text>
                <Text style={styles.warningSubtextoGrande}>
                  Ve a Gestión {">"} PIN y Acceso {">"} Cambiar PIN
                </Text>
              </View>

              <Text style={styles.advertenciaDesc}>
                Tu PIN actual es <Text style={styles.bold}>0000</Text> (el que viene de fábrica).
                Cualquier persona puede acceder. Cámbialo cuanto antes.
              </Text>

              <TouchableOpacity
                style={styles.btnEntendido}
                onPress={handleEntendido}
                activeOpacity={0.8}
              >
                <Text style={styles.btnEntendidoTexto}>Entendido, entrar</Text>
              </TouchableOpacity>
            </>
          ) : fase === "recuperar" ? (
            /* ── FASE: RECUPERAR PIN ── */
            <>
              <Text style={styles.titulo}>Recuperar PIN</Text>
              
              <Text style={styles.descRecuperar}>
                Comunícate con soporte y proporciona la fecha actual:
              </Text>
              
              <Text style={styles.fechaRecuperar}>
                {fechaHoyStr}
              </Text>
              
              <TextInput
                value={codigoRecuperacion}
                onChangeText={(val) => {
                  setCodigoRecuperacion(val);
                  setErrorRecuperacion("");
                }}
                keyboardType="numeric"
                maxLength={6}
                style={styles.inputRecuperar}
                placeholder="Código de 6 dígitos"
                placeholderTextColor={colors.textMuted}
              />

              {!!errorRecuperacion && (
                <Text style={styles.errorText}>{errorRecuperacion}</Text>
              )}

              <TouchableOpacity
                style={styles.btnVerificar}
                onPress={handleVerificarCodigo}
                activeOpacity={0.8}
              >
                <Text style={styles.btnVerificarTexto}>Verificar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnVolver}
                onPress={() => {
                  setFase("pin");
                  setCodigoRecuperacion("");
                  setErrorRecuperacion("");
                }}
              >
                <Text style={styles.btnVolverTexto}>Volver</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── FASES: INGRESAR PIN, NUEVO PIN, CONFIRMAR NUEVO PIN ── */
            <>
              <Text style={styles.titulo}>
                {fase === "pin"
                  ? titulo
                  : fase === "setNuevoPin"
                  ? "Crea tu nuevo PIN"
                  : "Confirma tu nuevo PIN"}
              </Text>

              <View style={styles.dotsRow}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      pin.length > i && styles.dotFilled,
                      error && styles.dotError,
                    ]}
                  />
                ))}
              </View>

              {error && (
                <Text style={styles.errorText}>
                  {fase === "confirmarNuevoPin" ? "Los PINs no coinciden" : "PIN incorrecto"}
                </Text>
              )}

              {verificando && (
                <Text style={styles.verificandoText}>
                  {fase === "confirmarNuevoPin" ? "Guardando..." : "Verificando..."}
                </Text>
              )}

              <View style={styles.teclado}>
                {TECLAS.map((tecla, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.tecla,
                      tecla === "" && styles.teclaVacia,
                      tecla === "⌫" && styles.teclaDelete,
                    ]}
                    onPress={() => handleTecla(tecla)}
                    disabled={tecla === "" || verificando}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.teclaTexto,
                        tecla === "⌫" && styles.teclaDeleteTexto,
                      ]}
                    >
                      {tecla}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {fase === "pin" && intentosFallidos >= 4 && (
                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => {
                    setFase("recuperar");
                    setCodigoRecuperacion("");
                    setErrorRecuperacion("");
                  }}
                >
                  <Text style={styles.forgotTexto}>¿Olvidaste tu PIN?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
                <Text style={styles.cancelTexto}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: 24,
      width: 300,
      alignItems: "center",
    },
    titulo: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
      marginBottom: 20,
    },
    dotsRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 8,
    },
    dot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: colors.textMuted,
      backgroundColor: "transparent",
    },
    dotFilled: {
      backgroundColor: "#F97316",
      borderColor: "#F97316",
    },
    dotError: {
      backgroundColor: "#ef4444",
      borderColor: "#ef4444",
    },
    errorText: {
      color: "#ef4444",
      fontSize: 12,
      marginBottom: 8,
    },
    verificandoText: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 8,
    },
    teclado: {
      flexDirection: "row",
      flexWrap: "wrap",
      width: 240,
      gap: 10,
      marginTop: 16,
      marginBottom: 16,
    },
    tecla: {
      width: 70,
      height: 60,
      backgroundColor: colors.bgInput,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    teclaVacia: {
      backgroundColor: "transparent",
    },
    teclaDelete: {
      backgroundColor: colors.bgInput,
    },
    teclaTexto: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "400",
    },
    teclaDeleteTexto: {
      color: "#F97316",
      fontSize: 20,
    },
    cancelBtn: {
      marginTop: 4,
      padding: 10,
    },
    cancelTexto: {
      color: colors.textMuted,
      fontSize: 14,
    },
    forgotBtn: {
      marginTop: 4,
      marginBottom: 8,
      padding: 10,
    },
    forgotTexto: {
      color: "#F97316",
      fontSize: 13,
      fontWeight: "500",
      textDecorationLine: "underline",
    },
    descRecuperar: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: "center",
      marginBottom: 12,
      lineHeight: 18,
    },
    fechaRecuperar: {
      color: "#F97316",
      fontSize: 18,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: 16,
    },
    inputRecuperar: {
      backgroundColor: colors.bgInput,
      color: colors.text,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      textAlign: "center",
      width: "100%",
      letterSpacing: 2,
      marginBottom: 16,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    btnVerificar: {
      backgroundColor: "#F97316",
      borderRadius: 12,
      paddingVertical: 12,
      width: "100%",
      alignItems: "center",
      marginBottom: 12,
    },
    btnVerificarTexto: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
    btnVolver: {
      padding: 10,
    },
    btnVolverTexto: {
      color: colors.textMuted,
      fontSize: 14,
    },
    // ── Estilos de advertencia ──────────────────────────────
    iconoCirculo: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: isDark ? "#2a1a00" : "#fff4e6",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
      borderWidth: 1,
      borderColor: "#F9731640",
    },
    iconoEmoji: {
      fontSize: 28,
    },
    advertenciaTitulo: {
      color: "#F97316",
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 14,
      textAlign: "center",
    },
    warningBoxGrande: {
      backgroundColor: isDark ? "#2a1a00" : "#fff4e6",
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginBottom: 14,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#F9731660",
      width: "100%",
    },
    warningTextoGrande: {
      color: "#F97316",
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
    },
    warningSubtextoGrande: {
      color: "#F97316",
      fontSize: 12,
      fontWeight: "400",
      textAlign: "center",
      marginTop: 4,
    },
    advertenciaDesc: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    bold: {
      fontWeight: "700",
      color: colors.text,
    },
    btnEntendido: {
      backgroundColor: "#F97316",
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 32,
      width: "100%",
      alignItems: "center",
    },
    btnEntendidoTexto: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
