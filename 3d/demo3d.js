// Demostración 3D de un ejercicio: cuerpo humano con esqueleto (modelo MakeHuman, licencia CC0),
// los músculos que trabajan encendidos, el recorrido marcado con una flecha y la forma correcta vs. el error común.
import * as THREE from './three.module.min.js';
import {EJ3D, POSE_BASE} from './ejercicios3d.js';

export const tiene3D = id => !!EJ3D[id];

const ZONAS_MAX = 16;
let DATOS = null;
async function cargar(){
  if(DATOS) return DATOS;
  const base = new URL('.', import.meta.url);
  const [meta, buf] = await Promise.all([fetch(new URL('cuerpo_h.json', base)).then(r => r.json()), fetch(new URL('cuerpo_h.bin', base)).then(r => r.arrayBuffer())]);
  const n = meta.n, nt = meta.tris; let o = 0;
  const pos = Float32Array.from(new Int16Array(buf, o, n * 3), v => v / 3000); o += n * 6;
  const idx = new Uint16Array(buf, o, nt * 3); o += nt * 6;
  const si = new Uint8Array(buf, o, n * 4); o += n * 4;
  const sw = new Uint8Array(buf, o, n * 4); o += n * 4;
  const zona = new Uint8Array(buf, o, n);
  DATOS = {meta, pos, idx, si, sw, zona};
  return DATOS;
}

// Material de "arcilla" gris con borde de luz; las zonas activas se encienden (naranja = trabaja, rojo = se sobrecarga por el error)
function materialCuerpo(){
  const u = {uAct:{value:new Float32Array(ZONAS_MAX)}, uMal:{value:new Float32Array(ZONAS_MAX)}, uPulso:{value:0}};
  const m = new THREE.MeshStandardMaterial({color:0x9aa1aa, roughness:.48, metalness:.05});
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
      attribute float zona; uniform float uAct[${ZONAS_MAX}]; uniform float uMal[${ZONAS_MAX}]; varying float vAct; varying float vMal;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      int zi = int(zona + .5); vAct = uAct[zi]; vMal = uMal[zi];`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying float vAct; varying float vMal; uniform float uPulso;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float pul = .55 + .45 * uPulso;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1., .45, .14), vAct * .75);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1., .16, .12), vMal * .8);
      totalEmissiveRadiance += vec3(1., .36, .06) * vAct * pul * .55 + vec3(1., .08, .05) * vMal * pul * .6;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      float fres = pow(1. - clamp(dot(normalize(vViewPosition), normal), 0., 1.), 3.);
      reflectedLight.directDiffuse += vec3(.35, .55, 1.) * fres * .55;`);
  };
  return {m, u};
}

const METAL = () => new THREE.MeshStandardMaterial({color:0x2a2d33, roughness:.35, metalness:.6});
const CROMO = () => new THREE.MeshStandardMaterial({color:0x9ca3ab, roughness:.25, metalness:.85});
function mancuerna(){
  const g = new THREE.Group(), metal = METAL();
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, 1.1, 16), CROMO()); mango.rotation.z = Math.PI / 2; g.add(mango);
  [-1, 1].forEach(s => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .32, 6), metal); p.rotation.z = Math.PI / 2; p.position.x = s * .7; g.add(p); });
  return g;
}
function barra(largo = 13, discos = true){
  const g = new THREE.Group(), metal = METAL();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, largo, 16), CROMO()); b.rotation.z = Math.PI / 2; g.add(b);
  const r = largo > 8 ? 1.6 : .7;
  if(discos) [-1, 1].forEach(s => [0, .38].forEach(d => { const p = new THREE.Mesh(new THREE.CylinderGeometry(d ? r * .66 : r, d ? r * .66 : r, .3, 28), metal); p.rotation.z = Math.PI / 2; p.position.x = s * (largo / 2 - (largo > 8 ? 1.3 : .5) - d); g.add(p); }));
  return g;
}
function manija(tipo){
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, tipo === 'soga' ? 1.6 : 1.2, 12), tipo === 'soga' ? new THREE.MeshStandardMaterial({color:0x30343a, roughness:.9}) : CROMO());
  b.rotation.z = Math.PI / 2; g.add(b);
  return g;
}
// Escenario: cajas (bancos, asientos, almohadillas), cilindros (barras fijas, rodillos) y cables de polea
const MAT_ESC = {banco:{color:0x2c3138, roughness:.7}, metal:{color:0x5b626b, roughness:.35, metalness:.7}, pad:{color:0x3d342f, roughness:.85}, cable:{color:0x0c0c0c, roughness:.6}};
function prop(p){
  const mat = new THREE.MeshStandardMaterial(MAT_ESC[p.m || (p.t === 'cil' ? 'metal' : 'banco')]);
  let o;
  if(p.t === 'caja') o = new THREE.Mesh(new THREE.BoxGeometry(...p.s), mat);
  else if(p.t === 'cil'){ o = new THREE.Mesh(new THREE.CylinderGeometry(p.r, p.r, p.l, 20), mat); }
  else if(p.t === 'cable') o = new THREE.Mesh(new THREE.CylinderGeometry(p.banda ? .1 : .04, p.banda ? .1 : .04, 1, 8), new THREE.MeshStandardMaterial(p.banda ? {color:0x2f9e6e, roughness:.7} : MAT_ESC.cable));
  else o = new THREE.Group();
  if(p.p) o.position.set(...p.p);
  if(p.rot) o.rotation.set(...p.rot.map(x => x * Math.PI / 180));
  return o;
}

const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const suave = t => t * t * (3 - 2 * t);

export async function crearDemo3D(el, id){
  const E = EJ3D[id];
  el.innerHTML = `<div class="d3"><canvas></canvas><svg class="d3-flechas" aria-hidden="true"></svg>
    <span class="d3-sello"></span><p class="d3-txt"></p><span class="d3-cargando">Cargando 3D…</span></div>
    <div class="d3-modos" role="group" aria-label="Forma correcta o error"></div>
    <p class="d3-ayuda">Arrastrá para girar el cuerpo.</p>`;
  const caja = el.querySelector('.d3'), cv = el.querySelector('canvas'), svg = el.querySelector('.d3-flechas');
  const D = await cargar();
  el.querySelector('.d3-cargando').remove();
  const R = new THREE.WebGLRenderer({canvas:cv, antialias:true, alpha:true});
  R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  const S = new THREE.Scene();
  S.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1c20, .9));
  const k = new THREE.DirectionalLight(0xffffff, 2.3); k.position.set(4, 10, 12); S.add(k);
  const r1 = new THREE.DirectionalLight(0x6f9bff, 1.6); r1.position.set(-9, 5, -8); S.add(r1);
  const r2 = new THREE.DirectionalLight(0xffb070, .9); r2.position.set(9, 3, -6); S.add(r2);
  const piso = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshStandardMaterial({color:0x1b1e23, roughness:.9}));
  piso.rotation.x = -Math.PI / 2; S.add(piso);
  let minY = 0; for(let i = 1; i < D.pos.length; i += 3) minY = Math.min(minY, D.pos[i]); piso.position.y = minY - .02;

  // Cuerpo con esqueleto
  const {meta} = D, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(D.pos, 3)); g.setIndex(new THREE.BufferAttribute(D.idx, 1));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(D.si), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(Float32Array.from(D.sw, v => v / 255), 4));
  g.setAttribute('zona', new THREE.BufferAttribute(Float32Array.from(D.zona), 1));
  g.computeVertexNormals();
  const huesos = meta.bones.map(b => { const x = new THREE.Bone(); x.name = b.n; return x; });
  meta.bones.forEach((b, i) => { const h = new THREE.Vector3(...b.h); if(b.p >= 0){ huesos[b.p].add(huesos[i]); h.sub(new THREE.Vector3(...meta.bones[b.p].h)); } huesos[i].position.copy(h); });
  const {m:mat, u} = materialCuerpo();
  const cuerpo = new THREE.SkinnedMesh(g, mat);
  huesos.filter((b, i) => meta.bones[i].p < 0).forEach(r => cuerpo.add(r));
  cuerpo.bind(new THREE.Skeleton(huesos)); cuerpo.frustumCulled = false;
  S.add(cuerpo);
  const B = Object.fromEntries(huesos.map(b => [b.name, b]));
  const REST = {}, prof = {}, LARGO = {};
  meta.bones.forEach(b => { REST[b.n] = new THREE.Vector3(b.t[0] - b.h[0], b.t[1] - b.h[1], b.t[2] - b.h[2]).normalize(); });
  // Segmentos: el hueso que se orienta mueve todo el tramo hasta la articulación siguiente (hombro→codo, codo→muñeca, cadera→rodilla…)
  const cab = Object.fromEntries(meta.bones.map(b => [b.n, new THREE.Vector3(...b.h)]));
  const SEG = {upperarm01:'lowerarm01', lowerarm01:'wrist', upperleg01:'lowerleg01', lowerleg01:'foot'};
  ['L', 'R'].forEach(l => Object.entries(SEG).forEach(([a, b]) => { LARGO[a + '.' + l] = cab[b + '.' + l].distanceTo(cab[a + '.' + l]); REST[a + '.' + l] = cab[b + '.' + l].clone().sub(cab[a + '.' + l]).normalize(); }));
  huesos.forEach(b => { let d = 0, x = b; while(x.parent && x.parent.isBone){ d++; x = x.parent; } prof[b.name] = d; });
  const raiz = B.root, raiz0 = raiz.position.clone();
  cuerpo.updateMatrixWorld(true);
  const pieRest = ['foot.L', 'foot.R'].map(n => B[n].getWorldPosition(new THREE.Vector3()));

  // Elementos: lo que se agarra (mancuernas, barra, manija, soga) y el escenario (bancos, poleas, máquinas)
  const tipoObj = E.obj || '', objs = [];
  if(tipoObj === 'mancuernas') objs.push(mancuerna(), mancuerna());
  if(tipoObj === 'mancuerna') objs.push(mancuerna());
  if(tipoObj === 'barra') objs.push(barra());
  if(tipoObj === 'barraZ' || tipoObj === 'barraCorta') objs.push(barra(tipoObj === 'barraZ' ? 4.6 : 6.5));
  if(tipoObj === 'manija' || tipoObj === 'soga') objs.push(manija(tipoObj));
  if(tipoObj === 'barraPolea') objs.push(barra(3.8, false));
  if(tipoObj === 'barraJalon') objs.push(barra(9, false));
  objs.forEach(o => S.add(o));
  const escena = (E.props || []).map(p => { const o = prop(p); S.add(o); return {p, o}; });

  const q = new THREE.Quaternion(), v = new THREE.Vector3();
  function apuntar(n, d){
    const b = B[n]; if(!b) return;
    b.parent.updateMatrixWorld(true); b.parent.getWorldQuaternion(q).invert();
    v.set(d[0], d[1], d[2]).normalize().applyQuaternion(q);
    b.quaternion.setFromUnitVectors(REST[n], v); b.updateMatrixWorld(true);
  }
  // Dirección que tiene un hueso si no se lo toca (sigue a su padre)
  function dirActual(n){ const b = B[n]; b.parent.updateMatrixWorld(true); return REST[n].clone().applyQuaternion(b.parent.getWorldQuaternion(new THREE.Quaternion())).toArray(); }
  function girar(n, ang){ const b = B[n]; if(!b) return; b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(REST[n], ang)); b.updateMatrixWorld(true); }
  function doblar(n, eje, ang){ const b = B[n]; if(!b) return; b.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...eje).normalize(), ang)); b.updateMatrixWorld(true); }
  const mezcla = (a, b, t) => a == null ? b : b == null ? a : Array.isArray(a) ? lerp3(a, b, t) : a + (b - a) * t;
  const espejo = d => [-d[0], d[1], d[2]];
  const pos3 = n => B[n].getWorldPosition(new THREE.Vector3());
  const mano = l => { const a = pos3(`finger2-1.${l}`), b = pos3(`finger5-1.${l}`), c = pos3(`finger3-2.${l}`); return {p:a.clone().add(b).add(c).multiplyScalar(1 / 3), eje:a.clone().sub(b).normalize()}; };
  // Tramo de dos huesos para que el extremo llegue a un punto; la articulación del medio apunta hacia "polo"
  function dosTramos(sN, eN, T, polo){
    const a = LARGO[sN], b = LARGO[eN];
    const Sh = pos3(sN), dv = T.clone().sub(Sh), d = Math.min(dv.length(), a + b - .02), u = dv.normalize();
    const ca = (a * a + d * d - b * b) / (2 * a * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    const n = u.clone().cross(polo).normalize(), pp = n.clone().cross(u).normalize();
    const El = Sh.clone().addScaledVector(u, a * ca).addScaledVector(pp, a * sa);
    apuntar(sN, El.clone().sub(Sh).toArray()); apuntar(eN, Sh.clone().addScaledVector(u, d).sub(El).toArray());
  }
  // El agarre está en la palma, un poco más allá de la muñeca
  function ik(l, T, polo){ const Sh = pos3('upperarm01.' + l); dosTramos('upperarm01.' + l, 'lowerarm01.' + l, T.clone().addScaledVector(T.clone().sub(Sh).normalize(), -.55), polo); }

  // Mezcla dos poses (t de 0 a 1) y la aplica
  let centro = null, ejeBarra = null;
  function aplicar(A, Bp, t){
    huesos.forEach(b => b.quaternion.identity());
    raiz.position.copy(raiz0);
    const rot = mezcla(A.rot, Bp.rot, t);
    if(rot) raiz.quaternion.setFromEuler(new THREE.Euler(...rot.map(x => x * Math.PI / 180), 'YXZ'));
    const pos = mezcla(A.pos, Bp.pos, t);
    if(pos) raiz.position.set(...pos);
    cuerpo.updateMatrixWorld(true);
    const base = E.sinBase ? {} : POSE_BASE.dirs;
    const dirs = Object.assign({}, base, A.dirs), dirsB = Object.assign({}, base, Bp.dirs);
    const dirDe = n => { const c = dirActual(n); return lerp3(dirs[n] || c, dirsB[n] || c, t); };
    Object.keys(Object.assign({}, dirs, dirsB)).sort((a, b) => prof[a] - prof[b]).forEach(n => apuntar(n, dirDe(n)));
    const gi = Object.assign({}, A.giros), giB = Object.assign({}, Bp.giros);
    const giro = n => (gi[n] || 0) + ((giB[n] || 0) - (gi[n] || 0)) * t;
    Object.keys(Object.assign({}, gi, giB)).forEach(n => girar(n, giro(n)));
    cuerpo.updateMatrixWorld(true);
    // Pies: a un punto (cinemática inversa) o apoyados donde estaban
    if(A.pies || Bp.pies){
      const pA = A.pies || Bp.pies, pB = Bp.pies || A.pies, polo = mezcla(A.poloPies, Bp.poloPies, t) || [0, 0, 1];
      ['L', 'R'].forEach(l => { const a = pA[l], b = pB[l]; if(a || b) dosTramos('upperleg01.' + l, 'lowerleg01.' + l, new THREE.Vector3(...lerp3(a || b, b || a, t)), new THREE.Vector3(...(l === 'L' ? polo : espejo(polo)))); });
    } else if(!pos){
      const pz = ['foot.L', 'foot.R'].map(pos3);
      raiz.position.add(new THREE.Vector3((pieRest[0].x + pieRest[1].x - pz[0].x - pz[1].x) / 2, (pieRest[0].y + pieRest[1].y - pz[0].y - pz[1].y) / 2, (pieRest[0].z + pieRest[1].z - pz[0].z - pz[1].z) / 2));
      cuerpo.updateMatrixWorld(true);
    }
    // Manos: a puntos (barra, polea, barras fijas) o barra apoyada en el cuerpo
    centro = null; ejeBarra = null;
    if(E.barra){
      const h = B[E.barra.hueso]; h.updateMatrixWorld(true);
      centro = h.localToWorld(new THREE.Vector3(...E.barra.off)); ejeBarra = new THREE.Vector3(1, 0, 0).applyQuaternion(h.getWorldQuaternion(new THREE.Quaternion()));
      ['L', 'R'].forEach((l, i) => ik(l, centro.clone().addScaledVector(ejeBarra, (i ? -1 : 1) * E.barra.ancho), new THREE.Vector3(...(i ? espejo(E.barra.polo) : E.barra.polo))));
    }
    if(A.manos || Bp.manos){
      const mA = A.manos || Bp.manos, mB = Bp.manos || A.manos, poloL = mezcla(A.polo, Bp.polo, t) || [0, -1, -.3];
      const tg = {};
      ['L', 'R'].forEach(l => { const a = mA[l], b = mB[l]; if(a || b) tg[l] = new THREE.Vector3(...lerp3(a || b, b || a, t)); });
      Object.entries(tg).forEach(([l, T]) => ik(l, T, new THREE.Vector3(...(l === 'L' ? poloL : espejo(poloL)))));
      if(tg.L && tg.R){ centro = tg.L.clone().add(tg.R).multiplyScalar(.5); ejeBarra = tg.L.clone().sub(tg.R).normalize(); }
    }
    // Después de la cinemática inversa: muñecas y pies orientados, giros de antebrazo
    const tarde = A.manos || Bp.manos || E.barra || A.pies || Bp.pies;
    if(tarde){
      ['wrist.L', 'wrist.R', 'foot.L', 'foot.R'].forEach(n => { if(dirs[n] || dirsB[n]) apuntar(n, dirDe(n)); });
      Object.keys(Object.assign({}, gi, giB)).filter(n => /^(lowerarm|wrist|foot)/.test(n)).forEach(n => girar(n, giro(n)));
    }
    const ag = mezcla(A.agarre, Bp.agarre, t) || 0;
    if(ag) ['L', 'R'].forEach(l => { for(let f = 2; f <= 5; f++) for(let s = 1; s <= 3; s++) doblar(`finger${f}-${s}.${l}`, [0, 0, l === 'L' ? -1 : 1], ag * (s === 1 ? .9 : 1.2));
      doblar(`finger1-2.${l}`, [0, 1, 0], (l === 'L' ? 1 : -1) * ag * .5); doblar(`finger1-3.${l}`, [0, 0, l === 'L' ? -1 : 1], ag * .6); });
    cuerpo.updateMatrixWorld(true);
    // Elementos en las manos
    if(tipoObj === 'mancuernas') ['L', 'R'].forEach((l, i) => { const h = mano(l); objs[i].position.copy(h.p); objs[i].quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), h.eje); });
    if(tipoObj === 'mancuerna' && E.lado === 'ambas'){ const a = mano('L'), b = mano('R'); objs[0].position.copy(a.p.add(b.p).multiplyScalar(.5)); objs[0].quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)); }
    else if(tipoObj === 'mancuerna'){ const h = mano(E.lado || 'R'); objs[0].position.copy(h.p); objs[0].quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), h.eje); }
    if(['barra', 'barraZ', 'barraCorta', 'barraPolea', 'barraJalon', 'manija', 'soga'].includes(tipoObj)){
      if(E.lado){ const h = mano(E.lado); centro = h.p; ejeBarra = h.eje; }
      else if(!centro || !E.barra && !(A.manos && A.manos.L && A.manos.R)){ const a = mano('L'), b = mano('R'); centro = a.p.clone().add(b.p).multiplyScalar(.5); ejeBarra = a.p.clone().sub(b.p).normalize(); }
      objs[0].position.copy(centro); objs[0].quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), ejeBarra);
    }
    // Partes de máquina que siguen al cuerpo (rodillos en los tobillos, plataforma en los pies…) y cables de polea
    escena.forEach(({p, o}) => {
      if(p.sigue){ const pts = p.sigue.map(pos3); o.position.copy(pts.reduce((a, x) => a.add(x), new THREE.Vector3()).multiplyScalar(1 / pts.length).add(new THREE.Vector3(...(p.off || [0, 0, 0])))); }
      if(p.t === 'cable'){
        // Extremos: punto fijo, 'manos', 'pies', una mano ('L'/'R') o un hueso (p. ej. 'foot.L')
        const punta = x => Array.isArray(x) ? new THREE.Vector3(...x) : x === 'manos' ? (centro ? centro.clone() : mano('R').p) : x === 'pies' ? pos3('foot.L').add(pos3('foot.R')).multiplyScalar(.5) : x.includes('.') ? pos3(x) : mano(x).p;
        const de = punta(p.de), a = punta(p.a);
        const d = a.clone().sub(de), L = d.length(); o.position.copy(de).addScaledVector(d, .5); o.scale.set(1, L, 1); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      }
    });
  }
  const punto = n => pos3(n);

  // Cámara: se gira arrastrando
  const cam = new THREE.PerspectiveCamera(32, 3 / 4, .1, 200);
  const mira = new THREE.Vector3(E.cam.x || 0, E.cam.y, E.cam.z || 0);
  let az = E.cam.az, arrastre = null;
  function ubicarCam(){ const d = E.cam.dist; cam.position.set(mira.x + Math.sin(az) * d, mira.y + d * Math.sin(E.cam.el || .08), mira.z + Math.cos(az) * d); cam.lookAt(mira); }
  cv.addEventListener('pointerdown', e => { arrastre = {x:e.clientX, az}; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if(arrastre){ az = arrastre.az - (e.clientX - arrastre.x) * .012; ubicarCam(); } });
  cv.addEventListener('pointerup', () => { arrastre = null; });
  function medir(){ const ww = caja.clientWidth, hh = caja.clientHeight; if(!ww) return; R.setSize(ww, hh, false); cam.aspect = ww / hh; cam.updateProjectionMatrix(); svg.setAttribute('viewBox', `0 0 ${ww} ${hh}`); }
  const ro = new ResizeObserver(medir); ro.observe(caja);

  // Modos: forma correcta y errores
  const modos = [{n:'Bien', A:E.A, B:E.B, musc:E.musc, txt:E.txt}].concat((E.errores || []).map(x => Object.assign({mal:true}, x, {A:x.A || E.A, B:x.B || E.B})));
  let modo = 0, t0 = performance.now(), trazo = [];
  const bt = el.querySelector('.d3-modos');
  bt.innerHTML = modos.map((x, i) => `<button type="button" data-d3m="${i}" aria-pressed="${i === 0}" class="${x.mal ? 'mal' : 'bien'}">${x.mal ? '✗' : '✓'} ${x.n}</button>`).join('');
  bt.addEventListener('click', e => { const b = e.target.closest('[data-d3m]'); if(!b) return; elegir(Number(b.dataset.d3m)); });
  function elegir(i){
    modo = i; t0 = performance.now(); const M = modos[i];
    bt.querySelectorAll('[data-d3m]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.d3m) === i)));
    u.uAct.value.fill(0); u.uMal.value.fill(0);
    Object.entries(M.musc || E.musc).forEach(([z, f]) => { u.uAct.value[meta.zonas.indexOf(z)] = f; });
    Object.entries(M.malMusc || {}).forEach(([z, f]) => { u.uMal.value[meta.zonas.indexOf(z)] = f; });
    const sello = el.querySelector('.d3-sello'); sello.textContent = M.mal ? '✗' : '✓'; sello.className = 'd3-sello ' + (M.mal ? 'mal' : 'bien');
    el.querySelector('.d3-txt').textContent = M.txt || '';
    // Recorrido del punto que se marca con la flecha (de la posición inicial a la final)
    trazo = []; for(let s = 0; s <= 14; s++){ aplicar(M.A, M.B, s / 14); trazo.push(punto(M.flecha || E.flecha || 'wrist.R').clone()); }
  }
  function dibujarFlecha(){
    const ww = caja.clientWidth, hh = caja.clientHeight, M = modos[modo];
    if(E.sinFlecha && !M.flecha){ svg.innerHTML = ''; return; }
    const pts = trazo.map(p => { const s = p.clone().project(cam); return [(s.x + 1) / 2 * ww, (1 - s.y) / 2 * hh]; });
    const desp = M.flechaDesp ?? E.flechaDesp ?? 26;   // la flecha va al costado del recorrido, no encima del cuerpo
    const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + desp).toFixed(1)} ${y.toFixed(1)}`).join('');
    const c = M.mal ? '#ff4d4d' : '#3ddc84', [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1], an = Math.atan2(y2 - y1, x2 - x1);
    const pt = (a, r) => `${(x2 + desp + Math.cos(a) * r).toFixed(1)},${(y2 + Math.sin(a) * r).toFixed(1)}`;
    svg.innerHTML = `<path d="${d}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-dasharray="7 6" opacity=".9"/><polygon points="${pt(an, 6)} ${pt(an + 2.5, 11)} ${pt(an - 2.5, 11)}" fill="${c}"/>`;
  }
  elegir(0); medir(); ubicarCam();

  // Tiempos: sube, pausa arriba, baja, pausa abajo
  const [tSube, tArriba, tBaja, tAbajo] = E.tempo || [1, .35, 1.8, .45], ciclo = tSube + tArriba + tBaja + tAbajo;
  let raf = 0, visible = true;
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if(visible && !raf) raf = requestAnimationFrame(cuadro); }); io.observe(caja);
  function cuadro(ahora){
    raf = 0; if(!visible || !document.body.contains(el)) return;
    const M = modos[modo], s = ((ahora - t0) / 1000) % ciclo;
    const t = s < tSube ? suave(s / tSube) : s < tSube + tArriba ? 1 : s < tSube + tArriba + tBaja ? 1 - suave((s - tSube - tArriba) / tBaja) : 0;
    aplicar(M.A, M.B, t);
    u.uPulso.value = E.isometrico ? .5 + .5 * Math.sin(ahora / 400) : t;
    R.render(S, cam); dibujarFlecha();
    raf = requestAnimationFrame(cuadro);
  }
  raf = requestAnimationFrame(cuadro);
  // Para pruebas: dibuja un cuadro fijo (t de 0 a 1) de un modo
  function fijar(t, i = modo){ if(i !== modo) elegir(i); cancelAnimationFrame(raf); raf = 0; visible = false; aplicar(modos[i].A, modos[i].B, t); u.uPulso.value = t; R.render(S, cam); dibujarFlecha(); }
  return {dbg:(t, i, ns) => { aplicar(modos[i].A, modos[i].B, t); return Object.fromEntries(ns.map(n => [n, punto(n).toArray().map(x => +x.toFixed(2))])); }, fijar, girar:a => { az = a; ubicarCam(); },
    destruir(){ cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); R.dispose(); g.dispose(); mat.dispose(); }};
}
