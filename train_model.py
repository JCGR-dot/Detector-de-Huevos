"""
train_model.py
Commit 1 - Entrenamiento del clasificador de huevos (sano / dañado).

Ejecutar en una máquina con GPU (Colab, no en la instancia t3.micro).
Descarga el dataset con kagglehub, entrena MobileNetV2 con transfer
learning y guarda el modelo entrenado como model.h5 para que
app.py lo sirva en la instancia EC2.
"""

import os
import kagglehub
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator

IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 15
CLASS_NAMES = ["sano", "danado"]  # debe coincidir con el orden alfabético de las carpetas del dataset


def descargar_dataset():
    path = kagglehub.dataset_download(
        "abdullahkhanuet22/eggs-images-classification-damaged-or-not"
    )
    print("Dataset descargado en:", path)
    return path


def construir_generadores(data_dir):
    train_gen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=25,
        brightness_range=[0.7, 1.3],
        zoom_range=0.15,
        horizontal_flip=True,
        validation_split=0.2,
    )

    train_flow = train_gen.flow_from_directory(
        data_dir,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        subset="training",
    )

    val_flow = train_gen.flow_from_directory(
        data_dir,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="binary",
        subset="validation",
    )

    return train_flow, val_flow


def construir_modelo():
    base = MobileNetV2(
        input_shape=(*IMG_SIZE, 3), include_top=False, weights="imagenet"
    )
    base.trainable = False  # fase 1: solo entrenamos la cabeza

    inputs = layers.Input(shape=(*IMG_SIZE, 3))
    x = base(inputs, training=False)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(1, activation="sigmoid")(x)

    model = models.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model, base


def fine_tune(model, base):
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-5),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


def main():
    data_dir = descargar_dataset()
    train_flow, val_flow = construir_generadores(data_dir)

    model, base = construir_modelo()
    print("Fase 1: entrenando solo la cabeza de clasificación")
    model.fit(train_flow, validation_data=val_flow, epochs=EPOCHS)

    print("Fase 2: fine-tuning de las últimas capas de MobileNetV2")
    model = fine_tune(model, base)
    model.fit(train_flow, validation_data=val_flow, epochs=10)

    os.makedirs("artifacts", exist_ok=True)
    model.save("artifacts/model.h5")
    print("Modelo guardado en artifacts/model.h5")


if __name__ == "__main__":
    main()
