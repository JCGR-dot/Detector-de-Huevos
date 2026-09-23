// config.js
// Commit 3 - Apunta a la instancia EC2 (i-09a86dfacb31b1688) mostrada
// en el resumen: IP elástica pública 34.232.159.175, puerto 5000 (Flask).
//
// IMPORTANTE:
// 1) La IP es una IP elástica (estática), así que no cambia al reiniciar
//    la instancia, pero verifica en la consola de AWS antes de probar.
// 2) El grupo de seguridad de la instancia debe permitir tráfico
//    entrante TCP en el puerto 5000 (0.0.0.0/0 o tu IP, para la demo).
// 3) El celular con Expo Go debe tener acceso a internet (no necesita
//    estar en la misma red que la instancia, al usar la IP pública).

export const API_BASE_URL = "http://34.232.159.175:5000";

export const ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  predict: `${API_BASE_URL}/predict`,
};
