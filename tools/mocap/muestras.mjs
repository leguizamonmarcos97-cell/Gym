// Lee un FBX de Mixamo en Chromium (three FBXLoader), reproduce la animación y guarda la posición en el mundo de cada articulación por cuadro.
import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const [fbx, salida, fps] = [process.argv[2], process.argv[3], Number(process.argv[4] || 30)];
const dir = path.dirname(fbx);
const srv = http.createServer((q,r)=>{
  if(q.url==='/p.html'){ r.writeHead(200,{'Content-Type':'text/html'}); r.end(`<script type="module">
import * as THREE from './js/three.module.js'; import {FBXLoader} from './js/FBXLoader.js';
const o = await new FBXLoader().loadAsync('./${path.basename(fbx)}');
const clip = o.animations[0], mx = new THREE.AnimationMixer(o); mx.clipAction(clip).play();
const huesos = []; o.traverse(x => { if(x.isBone) huesos.push(x); });
const res = {nombre:clip.name, dur:clip.duration, huesos:huesos.map(h => h.name), padres:huesos.map(h => huesos.indexOf(h.parent)), cuadros:[]};
const n = Math.round(clip.duration * ${fps});
for(let i = 0; i <= n; i++){ mx.setTime(i / ${fps}); o.updateMatrixWorld(true);
  res.cuadros.push(huesos.map(h => { const v = h.getWorldPosition(new THREE.Vector3()); return [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]; })); }
window.RES = res;</script>`); return; }
  const p = path.join(q.url.startsWith('/js/') ? path.resolve(dir) : dir, decodeURIComponent(q.url));
  fs.readFile(p,(e,d)=>{ if(e){r.writeHead(404);r.end();return;} r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':'application/octet-stream'}); r.end(d); });
}).listen(0);
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}); const pg = await b.newPage();
pg.on('pageerror', e => console.log('E', e.message)); pg.on('console', m => console.log('C', m.text()));
await pg.goto(`http://localhost:${srv.address().port}/p.html`); await pg.waitForFunction(() => window.RES, null, {timeout:120000});
const res = await pg.evaluate(() => window.RES); fs.writeFileSync(salida, JSON.stringify(res));
console.log(res.nombre, res.dur, res.cuadros.length, 'cuadros'); console.log(res.huesos.join(' '));
await b.close(); srv.close();
