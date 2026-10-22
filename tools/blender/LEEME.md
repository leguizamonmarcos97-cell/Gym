# Videos de ejercicios en Blender

Render de estudio (Cycles) del cuerpo con el esqueleto de Mixamo, con la animación del ejercicio,
los músculos que trabajan en rojo, short y medias negras, zapatillas de running y piso que refleja.

    blender -b -P tools/blender/escena.py -- tools/blender/sentadilla.json
    ffmpeg -stream_loop 2 -framerate 30 -i /tmp/cuadros/sq_%04d.png -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart videos/sentadilla_blender.mp4

Archivos que hacen falta (no se suben al repo, `*.fbx`/`*.glb` están en .gitignore):
- `cuerpo`: el cuerpo nuevo (`tools/cuerpos`) pasado por el auto-rigger de Mixamo (FBX, T-pose, Standard Skeleton 65).
- `anim`: la animación de Mixamo (FBX). Al usar el mismo esqueleto, los huesos se llaman igual.
- `zonas_npz`: posiciones originales del cuerpo nuevo + zona muscular de cada vértice (de `3d/cuerpo_h.*`).
- `zapa`: MaterialsVariantsShoe.glb de glTF-Sample-Assets (Shopify, CC BY 4.0).

Opciones del JSON: `musculos` (zona → intensidad), `brazos_frente`, `maniqui` (cabeza lisa), cámara (`az`, `dist`, `mira`, `alto_cam`, `lente`),
tamaño de la zapatilla (`largo_zapa`, `ancho_zapa`, `alto_zapa_k`), `muestras`, `ancho`/`altoimg`, `cuadros`.

## Fotos de ejercicios (inicio y final)
1. `tools/blender/app/exportar.mjs` abre cada ejercicio de la app (con una copia de `3d/demo3d.js` que agrega `exportar()`)
   y guarda la pose de inicio y de final: posiciones de los huesos, las barras/bancos/poleas y los músculos.
2. `escena.py` con `pose_json` + `pose_mh` (pose_mh.py) pone el cuerpo de Mixamo en esa pose, arma los aparatos
   y renderiza `<salida>0.png` y `<salida>1.png`. Ajustes por ejercicio en `ik` (p. ej. `{"tipo": "press_banca"}`),
   cámara (`az`, `el`, `zoom`).
3. `componer.py` arma la imagen con el título, los músculos y los dos pasos.

## Con captura de movimiento real (recomendado)
Paquete gratis "Free mocap pack 06: Fitness and Workout" (Anderson Rohr, uso libre; no se redistribuye, por eso no está en el repo).
1. `rk_export.py`: guarda las posiciones de los huesos de Rokoko cuadro por cuadro (`.npz`).
2. `escena.py` con `rk_npz` + `pose_rk` y `rk_cuadros` (cuadro de abajo y de arriba): el cuerpo de Mixamo copia la dirección de cada hueso
   (dedos incluidos), el brazo se escala a su largo, la barra se arma dentro de los puños y el banco debajo de la espalda.
   `toca_pecho` + `hacia_pies` ponen la barra sobre el medio del pecho en la posición de abajo.
