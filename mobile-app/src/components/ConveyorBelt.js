// ConveyorBelt.js
// Commit 4 - Simulación visual de la banda: el huevo se mueve por la
// banda y, según la "ruta" devuelta por el backend (sano / danado /
// revision), se desvía visualmente hacia el carril correspondiente.

import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";

const RUTA_CONFIG = {
  sano: { color: "#2E7D32", label: "Carril: SANO", desplazamiento: -90 },
  danado: { color: "#C62828", label: "Carril: RECHAZADO", desplazamiento: 90 },
  revision: { color: "#F9A825", label: "Carril: REVISIÓN MANUAL", desplazamiento: 0 },
};

export default function ConveyorBelt({ ruta, procesando }) {
  const posicionX = useRef(new Animated.Value(0)).current;
  const posicionY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (!ruta) return;
    const config = RUTA_CONFIG[ruta] || RUTA_CONFIG.revision;

    posicionX.setValue(0);
    posicionY.setValue(-60);

    Animated.sequence([
      Animated.timing(posicionY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(posicionX, {
        toValue: config.desplazamiento,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [ruta]);

  const config = ruta ? RUTA_CONFIG[ruta] || RUTA_CONFIG.revision : null;

  return (
    <View style={styles.contenedor}>
      <View style={styles.banda} />

      <Animated.View
        style={[
          styles.huevo,
          {
            transform: [{ translateX: posicionX }, { translateY: posicionY }],
            backgroundColor: procesando ? "#BDBDBD" : config ? config.color : "#FFF",
          },
        ]}
      />

      <View style={styles.carriles}>
        <Text style={[styles.carrilLabel, { color: RUTA_CONFIG.sano.color }]}>SANO</Text>
        <Text style={[styles.carrilLabel, { color: RUTA_CONFIG.revision.color }]}>REVISIÓN</Text>
        <Text style={[styles.carrilLabel, { color: RUTA_CONFIG.danado.color }]}>RECHAZADO</Text>
      </View>

      {config && (
        <Text style={[styles.rutaTexto, { color: config.color }]}>{config.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: "center", marginVertical: 20, height: 160 },
  banda: {
    width: "90%",
    height: 12,
    backgroundColor: "#424242",
    borderRadius: 6,
    marginTop: 60,
  },
  huevo: {
    position: "absolute",
    top: 40,
    width: 34,
    height: 44,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#00000022",
  },
  carriles: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 10,
  },
  carrilLabel: { fontSize: 11, fontWeight: "600" },
  rutaTexto: { marginTop: 14, fontSize: 16, fontWeight: "700" },
});
