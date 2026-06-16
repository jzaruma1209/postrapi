import { useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Vibration
} from "react-native";
import { verificarPin } from "../../services/pin.service";

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
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [verificando, setVerificando] = useState(false);

  const handleTecla = async (tecla: string) => {
    if (verificando) return;

    if (tecla === "⌫") {
      setPin((prev) => prev.slice(0, -1));
      setError(false);
      return;
    }

    if (tecla === "") return;

    const nuevoPin = pin + tecla;
    setPin(nuevoPin);
    setError(false);

    if (nuevoPin.length === 4) {
      setVerificando(true);
      const ok = await verificarPin(nuevoPin);
      setVerificando(false);

      if (ok) {
        setPin("");
        setError(false);
        onSuccess();
      } else {
        Vibration.vibrate(300);
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 800);
      }
    }
  };

  const handleCancel = () => {
    setPin("");
    setError(false);
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.titulo}>{titulo}</Text>

          {/* Indicador de dígitos */}
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
            <Text style={styles.errorText}>PIN incorrecto</Text>
          )}

          {/* Teclado numérico */}
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
                disabled={tecla === ""}
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

          <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#1e1e1e",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    padding: 24,
    width: 300,
    alignItems: "center",
  },
  titulo: {
    color: "#ffffff",
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
    borderColor: "#555",
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
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  teclaVacia: {
    backgroundColor: "transparent",
  },
  teclaDelete: {
    backgroundColor: "#2a2a2a",
  },
  teclaTexto: {
    color: "#ffffff",
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
    color: "#888",
    fontSize: 14,
  },
});
