// Graba un video vertical (1080×1920) de un ejercicio con el motor 3D de la app, cuadro por cuadro, y lo arma con ffmpeg.
// Uso: node tools/videos/grabar.mjs <ejercicio:variante> <salida.mp4> [fps]
// Variables opcionales: TITULO (nombre del ejercicio), EQUIPO (texto del equipo), CUADROS (carpeta temporal), ALTO (720 o 1080).
// Necesita Playwright con Chromium y ffmpeg.
import { createRequire } from 'module';
import http from 'http'; import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const req = createRequire(import.meta.url);
let chromium; try{ ({chromium} = req('playwright')); } catch(e){ ({chromium} = req(fs.existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : '/opt/node22/lib/node_modules/playwright')); }

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const [id, salida, fpsArg] = process.argv.slice(2);
const FPS = Number(fpsArg) || 24, ALTO = Number(process.env.ALTO) || 1080;
const NOMBRES = {pecho:'Pecho', abdomen:'Abdomen', oblicuos:'Oblicuos', dorsales:'Dorsales', trapecio:'Trapecio', lumbar:'Lumbar', hombros:'Hombros', biceps:'Bíceps', triceps:'Tríceps', antebrazos:'Antebrazos', gluteos:'Glúteos', cuadriceps:'Cuádriceps', isquios:'Isquiotibiales', aductores:'Aductores', pantorrillas:'Pantorrillas'};
// Hueso al que mira la cámara en el plano de cerca de cada músculo
const FOCO = {pecho:'spine03', abdomen:'spine02', oblicuos:'spine02', dorsales:'spine03', trapecio:'neck01', lumbar:'spine01', hombros:'shoulder01.R', biceps:'upperarm02.R', triceps:'upperarm02.R', antebrazos:'lowerarm02.R', gluteos:'pelvis.R', cuadriceps:'upperleg02.R', isquios:'upperleg02.R', aductores:'upperleg02.L', pantorrillas:'lowerleg02.R'};
const EQUIPO = {mancuernas:'Mancuernas', mancuerna:'Mancuerna', barra:'Barra', barraZ:'Barra Z', barraCorta:'Barra', barraPolea:'Polea', barraJalon:'Polea', manija:'Polea', soga:'Polea'};

const PAGINA = `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}
body{margin:0;width:540px;height:960px;overflow:hidden;background:#0c0e11;font-family:'Helvetica Neue',Arial,sans-serif;color:#fff}
#x,.d3{position:absolute;inset:0}.d3 canvas{width:100%;height:100%;display:block}
.d3-flechas{position:absolute;inset:0;width:100%;height:100%}.d3-flechas path,.d3-flechas polygon{display:none}
.d3-txt,.d3-modos,.d3-ayuda,.d3-sello{display:none}
.capa{position:absolute;transition:none}
#vin{inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.55))}
#tit{top:34px;left:0;right:0;text-align:center;font-weight:800;font-size:30px;letter-spacing:.3px;text-shadow:0 2px 14px #000}
#sub{top:76px;left:0;right:0;text-align:center}
#sub b{display:inline-block;padding:5px 14px;border-radius:14px;font-size:15px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.25)}
#sub b.bien{color:#5df59a;border-color:#3ddc84;box-shadow:0 0 14px rgba(61,220,132,.45)}
#sub b.mal{color:#ff7070;border-color:#ff4d4d;box-shadow:0 0 14px rgba(255,77,77,.45)}
#sello{top:122px;right:28px;width:60px;height:60px;border-radius:50%;display:none;align-items:center;justify-content:center;font-size:32px;font-weight:900;border:3px solid;background:rgba(0,0,0,.45)}
#sello.bien{display:flex;color:#3ddc84;border-color:#3ddc84;box-shadow:0 0 24px #3ddc84,inset 0 0 12px rgba(61,220,132,.5)}
#sello.mal{display:flex;color:#ff4d4d;border-color:#ff4d4d;box-shadow:0 0 24px #ff4d4d,inset 0 0 12px rgba(255,77,77,.5)}
#rep{top:132px;left:28px;font-weight:800;font-size:15px;letter-spacing:1.5px;color:rgba(255,255,255,.8)}
#lento{top:160px;left:28px;font-weight:800;font-size:13px;letter-spacing:2px;color:#ffb347;display:none}
#barras{left:22px;bottom:178px;width:220px;padding:12px 14px;border-radius:14px;background:rgba(10,12,16,.62);border:1px solid rgba(255,255,255,.12)}
#barras h4{margin:0 0 8px;font-size:11px;letter-spacing:2px;color:rgba(255,255,255,.6);font-weight:800}
.fila{margin:6px 0}.fila span{display:flex;justify-content:space-between;font-size:14px;font-weight:700}
.fila i{display:block;height:7px;margin-top:4px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden}
.fila i em{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#ff2f55,#ff8a5c);box-shadow:0 0 10px #ff3d64}
.fila.mal i em{background:linear-gradient(90deg,#ff1a1a,#ffb020);box-shadow:0 0 12px #ff2a2a}
#tip{left:22px;right:22px;bottom:82px;padding:12px 16px;border-radius:14px;background:rgba(10,12,16,.72);border-left:4px solid #3ddc84;font-size:16px;line-height:1.35;font-weight:600}
#tip.mal{border-left-color:#ff4d4d}
#marca{bottom:34px;left:0;right:0;text-align:center;font-weight:800;font-size:14px;letter-spacing:5px;color:rgba(255,255,255,.5)}
#intro,#cierre{inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px}
#intro{background:linear-gradient(180deg,rgba(8,10,13,.15),rgba(8,10,13,.7))}
#intro .eq{font-size:15px;font-weight:800;letter-spacing:3px;color:#9fc4ff;text-transform:uppercase}
#intro h1{margin:10px 0 6px;font-size:46px;line-height:1.05;font-weight:900;text-shadow:0 4px 24px #000}
#intro .lin{width:120px;height:3px;border-radius:2px;background:linear-gradient(90deg,#3d7bff,#ff3d64);box-shadow:0 0 12px #5a8dff}
#intro p{margin:12px 0 0;font-size:16px;color:#cfd6e0;font-weight:600;letter-spacing:1px}
#cierre{background:rgba(8,10,13,.82)}
#cierre h2{margin:0 0 18px;font-size:30px;font-weight:900;letter-spacing:1px}
#cierre ul{margin:0;padding:0;list-style:none;text-align:left;max-width:440px}
#cierre li{margin:10px 0;padding-left:30px;position:relative;font-size:18px;line-height:1.35;font-weight:600}
#cierre li:before{content:'✓';position:absolute;left:0;color:#3ddc84;font-weight:900}
#cierre .m{margin-top:28px;font-weight:900;letter-spacing:6px;color:rgba(255,255,255,.7)}
#negro{inset:0;background:#000;pointer-events:none}
</style><div id="x"></div><div class="capa" id="vin"></div><div class="capa" id="tit"></div><div class="capa" id="sub"></div><div class="capa" id="sello"></div>
<div class="capa" id="rep"></div><div class="capa" id="lento">● CÁMARA LENTA</div><div class="capa" id="barras"></div><div class="capa" id="tip"></div><div class="capa" id="marca">ATLAS GYM</div>
<div class="capa" id="intro"></div><div class="capa" id="cierre" style="opacity:0"></div><div class="capa" id="negro" style="opacity:0"></div>
<script type="module">import {crearDemo3D} from './3d/demo3d.js'; window.D = await crearDemo3D(document.getElementById('x'), ${JSON.stringify(id)}, {video:true}); window.ready = true;</script>`;

const srv = http.createServer((q, r) => {
  if(q.url === '/v.html'){ r.writeHead(200, {'Content-Type':'text/html'}); r.end(PAGINA); return; }
  const p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if(e){ r.writeHead(404); r.end(); return; } r.writeHead(200, {'Content-Type':p.endsWith('.js') ? 'text/javascript' : p.endsWith('.json') ? 'application/json' : 'application/octet-stream'}); r.end(d); });
}).listen(0);
const b = await chromium.launch({executablePath:process.env.CHROMIUM || '/opt/pw-browsers/chromium', args:['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const pg = await b.newPage({viewport:{width:540, height:960}, deviceScaleFactor:ALTO / 960});
pg.on('pageerror', e => console.log('Error:', e.message));
await pg.goto(`http://localhost:${srv.address().port}/v.html`); await pg.waitForFunction(() => window.ready, null, {timeout:180000});

const info = await pg.evaluate(() => ({cam:D.cam0(), modos:D.modos()}));
const {EJ3D} = await import(path.join(RAIZ, '3d/ejercicios3d.js'));
const E = EJ3D[id], tempo = E.tempo || [1, .35, 1.8, .45], ciclo = tempo.reduce((a, x) => a + x, 0);
const suave = t => t * t * (3 - 2 * t), mezcla = (a, b, t) => a + (b - a) * t;
const fase = s => { s = ((s % ciclo) + ciclo) % ciclo; const [a, b, c] = tempo; return s < a ? suave(s / a) : s < a + b ? 1 : s < a + b + c ? 1 - suave((s - a - b) / c) : 0; };
const orden = m => Object.entries(m).sort((a, b) => b[1] - a[1]);
const principal = orden(info.modos[0].musc)[0][0];
const c0 = info.cam, titulo = process.env.TITULO || id, equipo = process.env.EQUIPO || EQUIPO[E.obj] || 'Peso corporal';
// Puntos de mira: el músculo principal (plano de cerca) y el brazo o la pierna que se mueve (errores)
const miras = await pg.evaluate(([foco, modos]) => {
  D.fijar(1, 0); const f = D.hueso(foco);
  const lim = modos.map((m, i) => { D.fijar(.5, i); return null; });
  return {foco:f};
}, [FOCO[principal] || 'spine03', info.modos]);
const frases = t => (t || '').split(/(?<=\.)\s+/).map(x => x.trim()).filter(Boolean);

// Guion
const esc = [];
esc.push({tipo:'intro', dur:3, modo:0});
esc.push({tipo:'bien', dur:ciclo, modo:0, rep:'REP 1 / 2', cam:{az:c0.az, dist:1}});
esc.push({tipo:'bien', dur:ciclo, modo:0, rep:'REP 2 / 2', cam:{az:c0.az + 1.05, dist:.95}});
info.modos.slice(1, 3).forEach((m, i) => esc.push({tipo:'mal', dur:ciclo / .6, lento:.6, modo:i + 1, cam:{az:c0.az - .55 + i * 1.3, dist:.82}}));
esc.push({tipo:'bien', dur:ciclo, modo:0, rep:'ASÍ SÍ', cam:{az:c0.az - .5, dist:1.05}});
esc.push({tipo:'cierre', dur:3.2, modo:0});

const dir = fs.mkdtempSync(path.join(process.env.CUADROS || '/tmp', 'cuadros-'));
let n = 0; const total = Math.round(esc.reduce((a, e) => a + e.dur, 0) * FPS);
let camPrev = {az:c0.az - .4, el:c0.el + .18, dist:c0.dist * .62, mira:miras.foco};
for(const [k, e] of esc.entries()){
  const cuadros = Math.round(e.dur * FPS), M = info.modos[e.modo];
  const desde = {...camPrev};
  const musc = orden(M.mal ? {...M.musc, ...M.malMusc} : M.musc).slice(0, 4);
  const max = musc[0][1];
  const barras = musc.map(([z, v]) => ({n:NOMBRES[z] || z, p:Math.round(v / max * 100), mal:!!(M.malMusc || {})[z]}));
  const tip = e.tipo === 'mal' ? frases(M.txt).slice(0, 2).join(' ') : frases(info.modos[0].txt).slice(0, e.rep === 'REP 2 / 2' ? 2 : 1).slice(-1)[0] || '';
  for(let f = 0; f < cuadros; f++){
    const u = f / Math.max(1, cuadros - 1), s = f / FPS;
    let t, cam;
    if(e.tipo === 'intro'){
      t = .6 + .4 * Math.sin(s * 2.2);
      cam = {az:c0.az - .4 + .55 * suave(u), el:c0.el + .18 - .06 * u, dist:c0.dist * (.62 - .06 * u), mira:miras.foco};
    } else if(e.tipo === 'cierre'){
      t = .5 + .5 * Math.sin(s * 1.6);
      cam = {az:c0.az - .5 - .25 * u, el:c0.el + .05, dist:c0.dist * 1.1, mira:c0.mira};
    } else {
      t = fase(s * (e.lento || 1));
      const meta = {az:e.cam.az, el:c0.el + (e.tipo === 'mal' ? .06 : 0), dist:c0.dist * e.cam.dist, mira:c0.mira};
      const a = suave(Math.min(1, s / .9));   // la cámara llega al nuevo ángulo en menos de un segundo
      cam = {az:mezcla(desde.az, meta.az, a) + .08 * Math.sin(s * .7), el:mezcla(desde.el, meta.el, a), dist:mezcla(desde.dist, meta.dist, a), mira:desde.mira.map((x, i) => mezcla(x, meta.mira[i], a))};
    }
    if(f === cuadros - 1) camPrev = cam;
    // Fundido a negro corto entre escenas
    const fin = e.dur - s, negro = k === 0 ? Math.max(0, 1 - s / .4) : Math.max(0, 1 - s / .18) * .9;
    const negroFin = k === esc.length - 1 ? Math.max(0, 1 - fin / .5) : 0;
    await pg.evaluate(({t, m, cam, e, M, s, u, barras, tip, titulo, equipo, principal, negro, pulso, cierre}) => {
      D.camara(cam); D.fijar(t, m);
      const $ = id => document.getElementById(id);
      const intro = e.tipo === 'intro', fin = e.tipo === 'cierre';
      $('intro').style.opacity = intro ? Math.max(0, Math.min(1, (1.9 - s) / .5)) : 0;
      $('intro').innerHTML = `<div class="eq">${equipo}</div><h1>${titulo}</h1><div class="lin"></div><p>Técnica en 3D · ${principal}</p>`;
      $('cierre').style.opacity = fin ? Math.min(1, s / .5) : 0;
      $('cierre').innerHTML = `<h2>CLAVES</h2><ul>${cierre.map(x => `<li>${x}</li>`).join('')}</ul><div class="m">ATLAS GYM</div>`;
      $('tit').textContent = intro && s < 1.9 ? '' : titulo;
      $('sub').innerHTML = intro ? (s < 1.9 ? '' : '<b>Qué trabaja</b>') : fin ? '' : `<b class="${M.mal ? 'mal' : 'bien'}">${M.mal ? 'Error: ' + M.n : e.rep === 'ASÍ SÍ' ? 'Así sí' : 'Forma correcta'}</b>`;
      const se = $('sello'); se.className = intro || fin ? '' : M.mal ? 'mal' : 'bien'; se.textContent = M.mal ? '✕' : '✓';
      $('rep').textContent = e.tipo === 'bien' && e.rep !== 'ASÍ SÍ' ? e.rep : '';
      $('lento').style.display = e.lento ? 'block' : 'none';
      const verBarras = !fin && !(intro && s < 1.9);
      $('barras').style.opacity = verBarras ? 1 : 0;
      $('barras').innerHTML = `<h4>${M.mal ? 'SE CARGA' : 'CUÁNTO TRABAJA'}</h4>` + barras.map(b => `<div class="fila${b.mal ? ' mal' : ''}"><span>${b.n}<small>${b.p}%</small></span><i><em style="width:${(b.p * (.55 + .45 * pulso)).toFixed(1)}%"></em></i></div>`).join('');
      $('tip').style.opacity = !intro && !fin && tip ? Math.min(1, s / .4) : 0; $('tip').textContent = tip; $('tip').className = 'capa' + (M.mal ? ' mal' : '');
      $('negro').style.opacity = negro;
    }, {t, m:e.modo, cam, e, M, s, u, barras, tip, titulo, equipo, principal:NOMBRES[principal] || principal, negro:Math.max(negro, negroFin), pulso:t,
        cierre:[...frases(info.modos[0].txt), ...info.modos.slice(1, 3).map(x => 'Evitá: ' + x.n.toLowerCase() + '.')].slice(0, 4)});
    await pg.screenshot({path:path.join(dir, `c${String(n).padStart(5, '0')}.png`)});
    n++; if(n % 48 === 0) console.log(`${n}/${total}`);
  }
}
await b.close(); srv.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'c%05d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', ALTO > 720 ? '21' : '24', '-preset', 'slow', '-movflags', '+faststart', salida]);
fs.rmSync(dir, {recursive:true, force:true});
console.log('Listo:', salida, n, 'cuadros');
