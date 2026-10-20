# Figuras de cuerpo (img/cuerpos)

Imágenes 3D de los 8 tipos de cuerpo (hombre `h_*` y mujer `m_*`) que se usan en el perfil.
Se hacen con el modelo humano de [MakeHuman](http://www.makehumancommunity.org) (malla base, targets, piel, pelo, ojos y top deportivo: licencia CC0).

1. Bajar `makehuman` (carpeta `makehuman/data`) y los assets del sistema (`makehuman_system_assets_cc0.zip`).
2. `python3 gen.py hm` arma la malla de cada figura (peso, músculo, panza, brazos al costado) en `r/data/*.json`.
3. `node shot.mjs r out <nombres>` las renderiza con three.js en Chromium (`render.html` como `r/index.html`).
4. Se recortan todas con el mismo marco y se guardan a 200 px de ancho en WebP.
