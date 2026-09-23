// ResultModal.js
// Commit 4 - Muestra el heatmap de Grad-CAM y el motivo de la decisión
// (el "por qué" del diferencial: la zona del daño, no solo la etiqueta).

import React from "react";
import { Modal, View, Text, Image, Pressable, StyleSheet } from "react-native";

const MOTIVO_TEXTO = {
  prediccion_sana: "El modelo no detectó señales de daño relevantes.",
  dano_en_zona_central: "Daño detectado en la zona central del huevo (mayor riesgo).",
  dano_en_zona_borde_baja_severidad:
    "Posible daño cerca del borde superior/inferior (menor riesgo) — se envía a revisión manual.",
};

export default function ResultModal({ visible, resultado, onClose }) {
  if (!resultado) return null;

  const { ruta, prob_danado, detalle, heatmap_overlay_base64, latencia_ms } = resultado;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.fondo}>
        <View style={styles.tarjeta}>
          <Text style={styles.titulo}>Resultado de clasificación</Text>

          {heatmap_overlay_base64 && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${heatmap_overlay_base64}` }}
              style={styles.imagen}
            />
          )}

          <Text style={styles.ruta}>{ruta.toUpperCase()}</Text>
          <Text style={styles.detalle}>
            Confianza de daño: {(prob_danado * 100).toFixed(1)}%
          </Text>
          <Text style={styles.detalle}>{MOTIVO_TEXTO[detalle.motivo] || detalle.motivo}</Text>
          <Text style={styles.latencia}>Latencia de inferencia: {latencia_ms} ms</Text>

          <Pressable style={styles.boton} onPress={onClose}>
            <Text style={styles.botonTexto}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "#00000066", justifyContent: "center", padding: 20 },
  tarjeta: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, alignItems: "center" },
  titulo: { fontSize: 18, fontWeight: "700", marginBottom: 10 },
  imagen: { width: 220, height: 220, borderRadius: 12, marginBottom: 10 },
  ruta: { fontSize: 20, fontWeight: "800", marginTop: 4 },
  detalle: { fontSize: 13, color: "#444", textAlign: "center", marginTop: 4 },
  latencia: { fontSize: 12, color: "#888", marginTop: 8 },
  boton: {
    marginTop: 16,
    backgroundColor: "#1565C0",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  botonTexto: { color: "#FFF", fontWeight: "700" },
});
