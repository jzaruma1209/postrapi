import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { useMemo } from "react";
import { formatDate, formatTime, formatCurrency } from "../../utils/dates";
import { imprimirTicket, hayImpresoraConfigurada } from "../../services/printer.service";
import { useState, useEffect } from "react";
import type { DatosTicket } from "../../services/printer.service";
import { useColors, useThemeStore } from "../../stores/useThemeStore";

interface TicketModalProps {
  visible: boolean;
  datos: DatosTicket | null;
  onClose: () => void;
}

export default function TicketModal({ visible, datos, onClose }: TicketModalProps) {
  const colors = useColors();
  const isDark = useThemeStore((s) => s.isDark);
  const [tieneImpresora, setTieneImpresora] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

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
            {datos.numeroVenta != null && (
              <Text style={styles.numeroVenta}>Venta #{datos.numeroVenta}</Text>
            )}
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

            {(datos.descuentoTipo != null && datos.descuentoValor != null && datos.descuentoValor > 0) ? (
              <>
                <View style={styles.itemRow}>
                  <Text style={styles.itemNombre}>Subtotal</Text>
                  <Text style={styles.itemSubtotal}>{formatCurrency(datos.subtotal)}</Text>
                </View>
                <View style={styles.itemRow}>
                  <Text style={[styles.itemNombre, { color: "#ef4444" }]}>
                    Descuento {datos.descuentoTipo === 'porcentaje' ? `(${datos.descuentoValor}%)` : '(monto)'}
                  </Text>
                  <Text style={[styles.itemSubtotal, { color: "#ef4444" }]}>
                    -{formatCurrency(datos.subtotal - datos.total)}
                  </Text>
                </View>
              </>
            ) : null}

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

const createStyles = (colors: ReturnType<typeof useColors>, isDark: boolean) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    card: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: 24,
      width: "100%",
      maxHeight: "80%",
    },
    titulo: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: "center",
      marginBottom: 16,
    },
    scroll: { maxHeight: 400 },
    negocio: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
      textAlign: "center",
      marginBottom: 4,
    },
    numeroVenta: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: 4,
    },
    fecha: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: "center",
      marginBottom: 12,
    },
    divider: {
      height: 0.5,
      backgroundColor: colors.border,
      marginVertical: 10,
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    itemNombre: { color: colors.text, fontSize: 13 },
    itemCantidad: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    itemSubtotal: { color: "#F97316", fontSize: 13, fontWeight: "500" },
    totalRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    totalLabel: { color: colors.text, fontSize: 15, fontWeight: "500" },
    totalValor: { color: "#22c55e", fontSize: 18, fontWeight: "500" },
    metodoPago: { color: colors.textMuted, fontSize: 12, marginBottom: 4 },
    gracias: { color: colors.borderLight, fontSize: 12, textAlign: "center", marginTop: 8 },
    botonesRow: { flexDirection: "row", gap: 10, marginTop: 16 },
    btn: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    btnImprimir: { backgroundColor: "#F97316" },
    btnCerrar: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: "#F97316",
    },
    btnText: { color: "#fff", fontSize: 14, fontWeight: "500" },
  });
