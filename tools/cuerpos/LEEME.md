# Figuras de cuerpo (img/cuerpos)

Imágenes 3D de los 8 tipos de cuerpo de hoy (`h_*`, `m_*`) y de los 5 cuerpos de meta (`h_meta_*`, `m_meta_*`) que se usan en el perfil.
La marca de los abdominales y el pecho se pinta en `render.html` según la posición en la malla base.
Se hacen con el modelo humano de [MakeHuman](http://www.makehumancommunity.org) (malla base, targets, piel, pelo, ojos y top deportivo: licencia CC0).

1. Bajar `makehuman` (carpeta `makehuman/data`) y los assets del sistema (`makehuman_system_assets_cc0.zip`).
2. `python3 gen.py hm` arma la malla de cada figura (peso, músculo, panza, brazos al costado) en `r/data/*.json`.
3. `node shot.mjs r out <nombres>` las renderiza con three.js en Chromium (`render.html` como `r/index.html`).
4. Se recortan todas con el mismo marco y se guardan a 320 px de ancho en WebP (el render es de 880 × 2000).

## Cuerpo animado (3d/)

`python3 rig.py h` exporta el cuerpo con el esqueleto de MakeHuman (`rigs/default.mhskel` y sus pesos), las zonas musculares y la forma atlética a `3d/cuerpo_h.json` + `3d/cuerpo_h.bin`.
`3d/demo3d.js` lo anima con three.js; cada ejercicio se define en `3d/ejercicios3d.js` con la pose de inicio y la final (direcciones de los huesos), los músculos que trabajan y los errores comunes.

## Render en Blender (versión actual de img/cuerpos)
`blender -b -P figura_blender.py -- r/data/<nombre>.json r/tex salida.png <h|m> 640 64` renderiza cada figura con Cycles:
piel con textura de MakeHuman y subsurface, luz de estudio (clave, relleno y dos contraluces), fondo transparente.
El short, el top y el marcado de abdominales y pecho se calculan por píxel en nodos de Blender (mismas fórmulas que `render.html`).
Después se recortan todas con el mismo marco a 320 × 867 en WebP.
