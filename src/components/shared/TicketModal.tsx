import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { formatDate, formatTime, formatCurrency } from "../../utils/dates";
import { imprimirTicket, hayImpresoraConfigurada } from "../../services/printer.service";
import { useState, useEffect } from "react";
import type { DatosTicket } from "../../services/printer.service";

interface TicketModalProps {
  visible: boolean;
  datos: DatosTicket | null;
  onClose: () => void;
}

export default function TicketModal({ visible, datos, onClose }: TicketModalProps) {
  const [tieneImpresora, setTieneImpresora] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    hayImpresoraConfigurada().then(setTieneImpresora);
  }, []);

  const handleImprimir = async () => {
    if (!datos) return;
    setImprimiendo(true);
    await imprimirTicket(datos);
    setImprimiendo(false);
  };

  if (!datos) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.titulo}>Ticket de venta</Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Encabezado */}
            <Text style={styles.negocio}>{datos.negocio}</Text>
            <Text style={styles.fecha}>
              {formatDate(datos.fecha)} {formatTime(datos.fecha)}
            </Text>
            <View style={styles.divider} />

            {/* Items */}
            {datos.items.map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemNombre}>{item.nombre}</Text>
                  <Text style={styles.itemCantidad}>
                    x{item.cantidad} × {formatCurrency(item.precioUnitario)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOTAL</Text>
              <Text style={styles.totalValor}>{formatCurrency(datos.total)}</Text>
            </View>
            <Text style={styles.metodoPago}>
              Pago: {datos.metodoPago.toUpperCase()}
            </Text>

            <View style={styles.divider} />
            <Text style={styles.gracias}>¡Gracias por su compra!</Text>
          </ScrollView>

          {/* Botones */}
          <View style={styles.botonesRow}>
            {tieneImpresora && (
              <TouchableOpacity
                style={[styles.btn, styles.btnImprimir]}
                onPress={handleImprimir}
                disabled={imprimiendo}
              >
                <Text style={styles.btnText}>
                  {imprimiendo ? "Imprimiendo..." : "Imprimir"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnCerrar]}
              onPress={onClose}
            >
              <Text style={[styles.btnText, { color: "#F97316" }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: "#1e1e1e",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 0.5,
    borderColor: "#2a2a2a",
    padding: 24,
    width: "100%",
    maxHeight: "80%",
  },
  titulo: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  scroll: { maxHeight: 400 },
  negocio: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 4,
  },
  fecha: {
    color: "#888",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  divider: {
    height: 0.5,
    backgroundColor: "#2a2a2a",
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  itemNombre: { color: "#fff", fontSize: 13 },
  itemCantidad: { color: "#888", fontSize: 11, marginTop: 2 },
  itemSubtotal: { color: "#F97316", fontSize: 13, fontWeight: "500" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  totalLabel: { color: "#fff", fontSize: 15, fontWeight: "500" },
  totalValor: { color: "#22c55e", fontSize: 18, fontWeight: "500" },
  metodoPago: { color: "#888", fontSize: 12, marginBottom: 4 },
  gracias: { color: "#555", fontSize: 12, textAlign: "center", marginTop: 8 },
  botonesRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnImprimir: { backgroundColor: "#F97316" },
  btnCerrar: {
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#F97316",
  },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "500" },
});
