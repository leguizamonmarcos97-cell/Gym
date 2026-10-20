// Graba un video vertical (1080×1920) de un ejercicio con el motor 3D de la app, cuadro por cuadro, y lo arma con ffmpeg.
// Uso: node tools/videos/grabar.mjs <ejercicio:variante> <salida.mp4> [fps]
// Necesita Playwright con Chromium y ffmpeg.
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
let chromium; try{ ({chromium} = req('playwright')); } catch(e){ ({chromium} = req(fs.existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : '/opt/node22/lib/node_modules/playwright')); }
import http from 'http'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const [id, salida, fpsArg] = process.argv.slice(2);
const FPS = Number(fpsArg) || 24;
const NOMBRES = {pecho:'Pecho', abdomen:'Abdomen', oblicuos:'Oblicuos', dorsales:'Dorsales', trapecio:'Trapecio', lumbar:'Lumbar', hombros:'Hombros', biceps:'Bíceps', triceps:'Tríceps', antebrazos:'Antebrazos', gluteos:'Glúteos', cuadriceps:'Cuádriceps', isquios:'Isquiotibiales', aductores:'Aductores', pantorrillas:'Pantorrillas'};
// Hueso al que mira la cámara en el plano de cerca de cada músculo
const FOCO = {pecho:'spine03', abdomen:'spine02', oblicuos:'spine02', dorsales:'spine03', trapecio:'neck01', lumbar:'spine01', hombros:'shoulder01.R', biceps:'upperarm02.R', triceps:'upperarm02.R', antebrazos:'lowerarm02.R', gluteos:'pelvis.R', cuadriceps:'upperleg02.R', isquios:'upperleg02.R', aductores:'upperleg02.L', pantorrillas:'lowerleg02.R'};

const PAGINA = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;width:540px;height:960px;overflow:hidden;background:#0c0e11;font-family:'Archivo','Helvetica Neue',Arial,sans-serif;color:#fff}
#x,.d3{position:absolute;inset:0}.d3 canvas{width:100%;height:100%;display:block}
.d3-flechas{position:absolute;inset:0;width:100%;height:100%}.d3-flechas path,.d3-flechas polygon{display:none}
.d3-txt,.d3-modos,.d3-ayuda,.d3-sello{display:none}
#tit{position:absolute;top:42px;left:0;right:0;text-align:center;font-weight:800;font-size:34px;letter-spacing:.5px;text-shadow:0 2px 14px #000}
#sub{position:absolute;top:88px;left:30px;right:30px;text-align:center;font-weight:600;font-size:20px;color:#cfd6e0;text-shadow:0 2px 10px #000;transition:none}
#sello{position:absolute;top:140px;right:34px;width:58px;height:58px;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:32px;font-weight:900;border:3px solid;background:rgba(0,0,0,.45)}
#sello.bien{display:flex;color:#3ddc84;border-color:#3ddc84;box-shadow:0 0 22px #3ddc84,inset 0 0 12px rgba(61,220,132,.5)}
#sello.mal{display:flex;color:#ff4d4d;border-color:#ff4d4d;box-shadow:0 0 22px #ff4d4d,inset 0 0 12px rgba(255,77,77,.5)}
#musc{position:absolute;bottom:120px;left:0;right:0;text-align:center}
#musc span{display:inline-block;margin:4px;padding:7px 14px;border-radius:20px;font-weight:700;font-size:18px;background:rgba(220,40,60,.18);border:1.5px solid #ff4d6a;box-shadow:0 0 14px rgba(255,60,90,.55)}
#marca{position:absolute;bottom:40px;left:0;right:0;text-align:center;font-weight:800;font-size:16px;letter-spacing:4px;color:rgba(255,255,255,.55)}
</style><div id="x"></div><div id="tit"></div><div id="sub"></div><div id="sello"></div><div id="musc"></div><div id="marca">ATLAS GYM</div>
<script type="module">import {crearDemo3D} from './3d/demo3d.js'; window.D = await crearDemo3D(document.getElementById('x'), ${JSON.stringify(id)}); window.ready = true;</script>`;

const srv = http.createServer((q, r) => {
  if(q.url === '/v.html'){ r.writeHead(200, {'Content-Type':'text/html'}); r.end(PAGINA); return; }
  const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200, {'Content-Type':p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream'}); r.end(d); });
}).listen(0);
const puerto = srv.address().port;
const b = await chromium.launch({executablePath:process.env.CHROMIUM || '/opt/pw-browsers/chromium', args:['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const pg = await b.newPage({viewport:{width:540, height:960}, deviceScaleFactor:2});
pg.on('pageerror', e => console.log('Error:', e.message));
await pg.goto(`http://localhost:${puerto}/v.html`); await pg.waitForFunction(() => window.ready, null, {timeout:120000});

const info = await pg.evaluate(() => ({cam:D.cam0(), modos:D.modos()}));
const {EJ3D} = await import(path.join(RAIZ, '3d/ejercicios3d.js'));
const E = EJ3D[id], tempo = E.tempo || [1, .35, 1.8, .45], ciclo = tempo.reduce((a, x) => a + x, 0);
const suave = t => t * t * (3 - 2 * t);
const fase = s => { s %= ciclo; const [a, b, c] = tempo; return s < a ? suave(s / a) : s < a + b ? 1 : s < a + b + c ? 1 - suave((s - a - b) / c) : 0; };
const principal = Object.entries(info.modos[0].musc).sort((a, b) => b[1] - a[1]).map(([z]) => z);
const foco = await pg.evaluate(n => { D.fijar(1, 0); return D.hueso(n); }, FOCO[principal[0]] || 'spine03');
const nombreEj = process.env.TITULO || id;

// Guion: plano de cerca del músculo, forma correcta, errores (hasta 2) y cierre
const c0 = info.cam, escenas = [];
escenas.push({dur:2.6, modo:0, cerca:true, sub:'Qué trabaja', iso:true});
escenas.push({dur:ciclo * 2, modo:0, sub:'Forma correcta'});
info.modos.slice(1, 3).forEach((m, i) => escenas.push({dur:ciclo, modo:i + 1, sub:m.n}));
if(info.modos.length > 1) escenas.push({dur:ciclo, modo:0, sub:'Así sí'});

const dir = fs.mkdtempSync(path.join(process.env.CUADROS || '/tmp', 'cuadros-'));
let n = 0; const total = Math.round(escenas.reduce((a, e) => a + e.dur, 0) * FPS);
for(const [k, e] of escenas.entries()){
  const cuadros = Math.round(e.dur * FPS), M = info.modos[e.modo];
  const musc = Object.entries(M.mal ? {...M.musc, ...M.malMusc} : M.musc).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([z]) => NOMBRES[z] || z);
  for(let f = 0; f < cuadros; f++){
    const u = f / Math.max(1, cuadros - 1), s = f / FPS;
    const t = e.iso ? .55 + .45 * Math.sin(s * 2.4) : fase(s);
    // Cámara: giro lento alrededor del cuerpo; en el plano de cerca, más cerca y mirando al músculo
    const cam = e.cerca
      ? {az:c0.az - .45 + .6 * suave(u), el:c0.el + .18, dist:c0.dist * (.68 - .08 * u), mira:foco}
      : {az:c0.az + .35 * Math.sin((k * 1.7 + u * 1.2) * 1.3), el:c0.el, dist:c0.dist * (1.03 - .05 * u), mira:c0.mira};
    await pg.evaluate(({t, m, cam, tit, sub, mal, musc}) => {
      D.camara(cam); D.fijar(t, m);
      document.getElementById('tit').textContent = tit; document.getElementById('sub').textContent = sub;
      const se = document.getElementById('sello'); se.className = m === 0 && sub === 'Qué trabaja' ? '' : mal ? 'mal' : 'bien'; se.textContent = mal ? '✕' : '✓';
      document.getElementById('musc').innerHTML = musc.map(x => `<span>${x}</span>`).join('');
    }, {t, m:e.modo, cam, tit:nombreEj, sub:e.sub, mal:M.mal, musc});
    await pg.screenshot({path:path.join(dir, `c${String(n).padStart(5, '0')}.png`)});
    n++; if(n % 24 === 0) console.log(`${n}/${total}`);
  }
}
await b.close(); srv.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'c%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', salida]);
fs.rmSync(dir, {recursive:true, force:true});
console.log('Listo:', salida, n, 'cuadros');
