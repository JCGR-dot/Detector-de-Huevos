// HomeScreen.js
// Commit 5 - Pantalla principal: toma/selecciona foto del huevo, la
// envía al backend en la instancia EC2 y anima la banda con el resultado.

import React, { useState } from "react";
import { View, Text, Pressable, Image, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";

import ConveyorBelt from "../components/ConveyorBelt";
import ResultModal from "../components/ResultModal";
import { ENDPOINTS } from "../config";

export default function HomeScreen() {
  const [imagenUri, setImagenUri] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const seleccionarImagen = async (desdeCamera) => {
    const permiso = desdeCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert("Permiso requerido", "Se necesita permiso para continuar.");
      return;
    }

    const resultadoPicker = desdeCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (!resultadoPicker.canceled) {
      const uri = resultadoPicker.assets[0].uri;
      setImagenUri(uri);
      clasificar(uri);
    }
  };

  const clasificar = async (uri) => {
    setProcesando(true);
    setResultado(null);

    try {
      const formData = new FormData();
      formData.append("imagen", {
        uri,
        name: "huevo.jpg",
        type: "image/jpeg",
      });

      const respuesta = await fetch(ENDPOINTS.predict, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!respuesta.ok) throw new Error("Error del servidor");

      const data = await respuesta.json();
      setResultado(data);
      setModalVisible(true);
    } catch (error) {
      Alert.alert(
        "No se pudo conectar al servidor",
        "Verifica que la instancia EC2 esté encendida y el puerto 5000 abierto.\n\n" + error.message
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.header}>Clasificador de huevos — Banda simulada</Text>

      <ConveyorBelt ruta={resultado?.ruta} procesando={procesando} />

      {imagenUri && <Image source={{ uri: imagenUri }} style={styles.preview} />}
      {procesando && <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 10 }} />}

      <View style={styles.botones}>
        <Pressable style={styles.boton} onPress={() => seleccionarImagen(true)}>
          <Text style={styles.botonTexto}>Tomar foto</Text>
        </Pressable>
        <Pressable style={[styles.boton, styles.botonSecundario]} onPress={() => seleccionarImagen(false)}>
          <Text style={styles.botonTexto}>Elegir de galería</Text>
        </Pressable>
      </View>

      <ResultModal
        visible={modalVisible}
        resultado={resultado}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#FFF8E7", paddingTop: 60, alignItems: "center" },
  header: { fontSize: 18, fontWeight: "700", textAlign: "center", paddingHorizontal: 20 },
  preview: { width: 140, height: 140, borderRadius: 12, marginTop: 10 },
  botones: { flexDirection: "row", marginTop: 30 },
  boton: {
    backgroundColor: "#1565C0",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    marginHorizontal: 8,
  },
  botonSecundario: { backgroundColor: "#455A64" },
  botonTexto: { color: "#FFF", fontWeight: "700" },
});
