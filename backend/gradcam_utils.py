"""
gradcam_utils.py
Commit 2 - Diferencial del proyecto (Opción A).

En vez de usar Grad-CAM solo para "explicar" la predicción al final,
aquí el mapa de calor se usa para TOMAR LA DECISIÓN:

- Si el modelo predice "dañado" y el centroide del mapa de calor cae
  en la zona central del huevo (mayor riesgo real de contaminación) ->
  se RECHAZA automáticamente.
- Si el modelo predice "dañado" pero el centroide cae en el 15% superior
  o inferior del huevo (zona de menor riesgo) -> se manda a REVISIÓN
  manual en vez de rechazo automático.
- Si el modelo predice "sano" -> se ACEPTA directo.
"""

import numpy as np
import tensorflow as tf
import cv2

LAST_CONV_LAYER = "Conv_1"  # última capa convolucional de MobileNetV2
ZONA_CRITICA_MARGEN = 0.15  # 15% superior/inferior = zona de menor riesgo


def generar_gradcam(model, img_array, last_conv_layer_name=LAST_CONV_LAYER):
    """Devuelve el mapa de calor Grad-CAM (valores 0-1) para img_array (1,H,W,3)."""
    grad_model = tf.keras.models.Model(
        [model.inputs],
        [model.get_layer(last_conv_layer_name).output, model.output],
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        loss = predictions[:, 0]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.reduce_max(heatmap) + 1e-8)
    return heatmap.numpy()


def centroide_heatmap(heatmap):
    """Calcula el centroide (fila, col) normalizado [0,1] del mapa de calor."""
    heatmap_resized = cv2.resize(heatmap, (224, 224))
    total = heatmap_resized.sum()
    if total == 0:
        return 0.5, 0.5  # sin activación clara -> asumir centro

    ys, xs = np.indices(heatmap_resized.shape)
    fila = (ys * heatmap_resized).sum() / total / heatmap_resized.shape[0]
    col = (xs * heatmap_resized).sum() / total / heatmap_resized.shape[1]
    return fila, col


def decidir_ruta(prob_danado, heatmap, umbral=0.5):
    """
    Regla de decisión del diferencial (Opción A).
    Devuelve: ("sano" | "danado" | "revision", detalle_dict)
    """
    if prob_danado < umbral:
        return "sano", {"motivo": "prediccion_sana", "confianza": float(1 - prob_danado)}

    fila_centroide, _ = centroide_heatmap(heatmap)
    en_zona_critica = ZONA_CRITICA_MARGEN < fila_centroide < (1 - ZONA_CRITICA_MARGEN)

    if en_zona_critica:
        return "danado", {
            "motivo": "dano_en_zona_central",
            "centroide_fila": float(fila_centroide),
            "confianza": float(prob_danado),
        }
    else:
        return "revision", {
            "motivo": "dano_en_zona_borde_baja_severidad",
            "centroide_fila": float(fila_centroide),
            "confianza": float(prob_danado),
        }


def heatmap_a_base64_overlay(heatmap, img_original_rgb):
    """Superpone el heatmap sobre la imagen original y devuelve bytes JPEG."""
    heatmap_resized = cv2.resize(heatmap, (img_original_rgb.shape[1], img_original_rgb.shape[0]))
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_color = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

    overlay = np.uint8(img_original_rgb * 0.6 + heatmap_color * 0.4)
    success, buffer = cv2.imencode(".jpg", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
    return buffer.tobytes() if success else None
