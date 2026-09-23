# Clasificador de huevos — Banda simulada (End2End)

Estructura de commits del proyecto:

1. **Commit 1** — `backend/requirements.txt`, `backend/train_model.py`
   Entrenamiento del modelo (MobileNetV2 + transfer learning) sobre el dataset de Kaggle.
2. **Commit 2** — `backend/gradcam_utils.py`, `backend/app.py`
   Diferencial (Opción A): Grad-CAM usado como parte de la decisión (zona central = rechazo, zona de borde = revisión manual). API Flask para servir el modelo.
3. **Commit 3** — `mobile-app/package.json`, `mobile-app/app.json`, `mobile-app/src/config.js`
   Configuración base del proyecto Expo y apuntado a la instancia EC2.
4. **Commit 4** — `mobile-app/src/components/ConveyorBelt.js`, `mobile-app/src/components/ResultModal.js`
   Componentes visuales: banda animada y modal con el heatmap.
5. **Commit 5** — `mobile-app/src/screens/HomeScreen.js`, `mobile-app/App.js`
   Pantalla principal: cámara/galería → API → animación de la banda.

## 1. Desplegar el backend en la instancia EC2 (i-09a86dfacb31b1688)

```bash
# Conéctate a la instancia (usa tu .pem)
ssh -i tu-llave.pem ec2-user@34.232.159.175

# En la instancia
sudo yum install -y python3-pip   # o apt, según la AMI
git clone <tu-repo> egg-cnn-demo
cd egg-cnn-demo/backend
pip3 install -r requirements.txt

# Copia artifacts/model.h5 (entrenado con train_model.py, idealmente en Colab)
# a esta carpeta antes de levantar la API

python3 app.py
```

**Importante — Grupo de seguridad**: en la consola de AWS, edita el Security Group de la instancia y agrega una regla de entrada TCP en el puerto **5000** (origen 0.0.0.0/0 para la demo, o tu IP para mayor seguridad). Sin esto, Expo Go no podrá llegar a la API aunque el servidor esté corriendo.

Para producción/demo estable, usa gunicorn en vez de `python3 app.py`:
```bash
gunicorn -w 2 -b 0.0.0.0:5000 app:app
```

Verifica que responde antes de probar desde el celular:
```bash
curl http://34.232.159.175:5000/health
```

## 2. Probar la app con Expo Go

```bash
cd mobile-app
npm install
npx expo start
```

Esto abre un código QR en la terminal/navegador. Abre la app **Expo Go** en tu celular (Android o iOS) y escanea el código QR — no hace falta que el celular esté en la misma red que la instancia EC2, porque `src/config.js` apunta a la IP pública `34.232.159.175:5000`.

Si cambias la IP elástica de la instancia, actualiza `API_BASE_URL` en `mobile-app/src/config.js`.

## 3. Flujo de la demo

1. Tomas o eliges una foto de un huevo.
2. La app envía la imagen a `/predict` en la instancia EC2.
3. El backend calcula la probabilidad de daño y el Grad-CAM.
4. Se aplica la regla del diferencial: zona central → rechazo, zona de borde → revisión, sin daño → aceptado.
5. La banda animada mueve el huevo hacia el carril correspondiente y se muestra el heatmap con el motivo de la decisión.
