import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const lista = JSON.parse(fs.readFileSync('lista.json')).filter(x => x[2]);
const srv = http.createServer((q,r)=>{ if(q.url.startsWith('/t.html')){r.writeHead(200,{'Content-Type':'text/html'});r.end(`<!doctype html><div id="x" style="width:300px;height:300px"></div><script type="module">import {crearDemo3D} from './3d/demo3d.js'; window.mk=async k=>{ document.getElementById('x').innerHTML=''; window.D=await crearDemo3D(document.getElementById('x'), k); return true; }; window.ready=true;</script>`);return;}
  let u=decodeURIComponent(q.url.split('?')[0]); let p= u==='/3d/demo3d.js' ? path.resolve('demo3d_exp.js') : path.join('/home/user/Gym',u);
  fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':'application/octet-stream'});r.end(d);});}).listen(0);
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pg = await b.newPage({viewport:{width:300,height:300}}); pg.on('pageerror',e=>console.log('E',e.message));
await pg.goto(`http://localhost:${srv.address().port}/t.html`); await pg.waitForFunction(()=>window.ready);
fs.mkdirSync('poses',{recursive:true});
for(const [dia,nombre,[id,v]] of lista){
  const k=`${id}:${v}`;
  try{
    await pg.evaluate(k=>mk(k),k);
    const r = await pg.evaluate(()=>{ const out={cam:D.cam0(), musc:D.modos()[0].musc, poses:[]}; for(const t of [0,1]){ D.fijar(t,0); out.poses.push(D.exportar()); } return out; });
    r.nombre=nombre; r.dia=dia; r.id=k;
    fs.writeFileSync(`poses/${k.replace(':','_')}.json`,JSON.stringify(r)); console.log('ok',k,r.poses[0].mallas.length,'mallas',JSON.stringify(r.musc));
  }catch(e){ console.log('FALLO',k,e.message); }
}
await b.close(); srv.close();
