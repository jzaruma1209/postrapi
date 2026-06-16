import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { verificarPin, cambiarPin } from "../../../src/services/pin.service";

export default function GestionPin() {
  const router = useRouter();

  const [pinActual, setPinActual] = useState("");
  const [pinNuevo, setPinNuevo] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");

  const handleGuardar = async () => {
    if (!pinActual || !pinNuevo || !confirmarPin) {
      Alert.alert("Error", "Todos los campos son obligatorios.");
      return;
    }

    if (pinNuevo.length !== 4) {
      Alert.alert("Error", "El nuevo PIN debe tener exactamente 4 dígitos.");
      return;
    }

    if (pinNuevo !== confirmarPin) {
      Alert.alert("Error", "El PIN nuevo y la confirmación no coinciden.");
      return;
    }

    try {
      const esCorrecto = await verificarPin(pinActual);
      if (!esCorrecto) {
        Alert.alert("Error", "El PIN actual es incorrecto.");
        return;
      }

      await cambiarPin(pinNuevo);
      Alert.alert("Éxito", "PIN actualizado correctamente.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error al cambiar PIN:", error);
      Alert.alert("Error", "Hubo un problema al cambiar el PIN.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#141414" }}>
      {/* Top Bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 48,
          paddingBottom: 16,
          backgroundColor: "#141414",
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Feather name="arrow-left" size={20} color="#fff" />
          <Text style={{ fontSize: 16, fontWeight: "500", color: "#ffffff" }}>PIN y Acceso</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View
          style={{
            backgroundColor: "#1a1a00",
            borderWidth: 0.5,
            borderColor: "#333",
            borderRadius: 10,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Feather name="lock" size={16} color="#F97316" />
          <Text style={{ fontSize: 12, color: "#aaa", flex: 1 }}>
            El PIN de supervisor se requiere para acceder a la gestión, aplicar descuentos o modificar el stock.
          </Text>
        </View>

        <View style={{ backgroundColor: "#1e1e1e", borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: "#2a2a2a", gap: 16 }}>
          <View>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>PIN Actual</Text>
            <TextInput
              value={pinActual}
              onChangeText={setPinActual}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              style={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                letterSpacing: 4,
              }}
              placeholderTextColor="#666"
              placeholder="••••"
            />
          </View>

          <View>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Nuevo PIN (4 dígitos)</Text>
            <TextInput
              value={pinNuevo}
              onChangeText={setPinNuevo}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              style={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                letterSpacing: 4,
              }}
              placeholderTextColor="#666"
              placeholder="••••"
            />
          </View>

          <View>
            <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Confirmar Nuevo PIN</Text>
            <TextInput
              value={confirmarPin}
              onChangeText={setConfirmarPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              style={{
                backgroundColor: "#2a2a2a",
                color: "#fff",
                borderRadius: 10,
                padding: 12,
                fontSize: 14,
                letterSpacing: 4,
              }}
              placeholderTextColor="#666"
              placeholder="••••"
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={handleGuardar}
          style={{
            backgroundColor: "#F97316",
            padding: 14,
            borderRadius: 10,
            alignItems: "center",
            marginTop: 8,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "500", fontSize: 14 }}>Cambiar PIN</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
