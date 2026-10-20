# Movimientos grabados (captura de movimiento de Mixamo)

Los ejercicios con movimiento grabado usan las direcciones de los huesos de una animación de Mixamo,
adaptadas al esqueleto de la app. **Los archivos `.fbx` originales no se guardan en el repositorio**
(las condiciones de Mixamo permiten usar las animaciones en el proyecto, no redistribuir los archivos).

## Pasos

1. Bajar de mixamo.com la animación en **FBX Binary**, **Without Skin**, **30 fps**, sin "Keyframe Reduction".
2. Sacar las posiciones de las articulaciones por cuadro (necesita Playwright con Chromium y el `FBXLoader` de three.js
   con `fflate.module.js`, `NURBSCurve.js` y `NURBSUtils.js` en una carpeta `js/` junto al `.fbx`):

       node tools/mocap/muestras.mjs carpeta/movimiento.fbx muestras.json 30

3. Convertirlas al esqueleto de la app:

       python3 tools/mocap/convertir.py muestras.json 3d/anim/<nombre>.json

4. En `3d/ejercicios3d.js`, agregar `anim:'<nombre>'` al ejercicio. La forma correcta usa el movimiento grabado;
   los errores siguen usando las poses A/B. Con `animLento` se ajusta la velocidad (1.5 = 50 % más lento que la grabación).

## Hechos

| Ejercicio | Animación de Mixamo |
|---|---|
| `sentadilla:libre` | Air Squat |
