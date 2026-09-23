"""
app.py
Commit 2 - API de inferencia, pensada para correr en la instancia EC2
(i-09a86dfacb31b1688, IP elástica 34.232.159.175).

Endpoints:
  GET  /health            -> chequeo de vida, para probar conectividad desde Expo Go
  POST /predict            -> recibe una imagen y devuelve la decisión de la banda

Ejecutar en la instancia:
  pip install -r requirements.txt
  python app.py
(usar gunicorn en producción, ver README.md)
"""

import base64
import io
import time

import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import tensorflow as tf

from gradcam_utils import generar_gradcam, decidir_ruta, heatmap_a_base64_overlay

app = Flask(__name__)
CORS(app)  # necesario para que la app de Expo Go (otro origen) pueda llamar a la API

IMG_SIZE = (224, 224)
MODEL_PATH = "artifacts/model.h5"

print("Cargando modelo...")
model = tf.keras.models.load_model(MODEL_PATH)
print("Modelo cargado.")


def preprocesar_imagen(file_bytes):
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    img_resized = img.resize(IMG_SIZE)
    img_array = np.array(img_resized) / 255.0
    return np.expand_dims(img_array, axis=0), np.array(img_resized)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "servicio": "clasificador-huevos"})


@app.route("/predict", methods=["POST"])
def predict():
    if "imagen" not in request.files:
        return jsonify({"error": "envía la imagen en el campo 'imagen'"}), 400

    t0 = time.time()
    file_bytes = request.files["imagen"].read()
    img_array, img_rgb_uint8 = preprocesar_imagen(file_bytes)

    prob_danado = float(model.predict(img_array, verbose=0)[0][0])
    heatmap = generar_gradcam(model, img_array)
    ruta, detalle = decidir_ruta(prob_danado, heatmap)

    overlay_bytes = heatmap_a_base64_overlay(heatmap, img_rgb_uint8)
    overlay_b64 = base64.b64encode(overlay_bytes).decode("utf-8") if overlay_bytes else None

    latencia_ms = round((time.time() - t0) * 1000, 1)

    return jsonify({
        "ruta": ruta,                    # "sano" | "danado" | "revision"
        "prob_danado": prob_danado,
        "detalle": detalle,
        "heatmap_overlay_base64": overlay_b64,
        "latencia_ms": latencia_ms,
    })


if __name__ == "__main__":
    # host 0.0.0.0 para que sea accesible desde el celular en la misma red / por IP pública
    app.run(host="0.0.0.0", port=5000)
