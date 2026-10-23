import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const OUT=process.argv[2];
const srv=http.createServer((q,r)=>{let p=path.join('/home/user/Gym',decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return;}const t=p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':p.endsWith('.webp')?'image/webp':p.endsWith('.svg')?'image/svg+xml':'application/octet-stream';r.writeHead(200,{'Content-Type':t});r.end(d);});}).listen(0);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:'dark'});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await pg.goto(`http://localhost:${srv.address().port}/index.html`);
await pg.waitForSelector('#cuest:not([hidden])',{timeout:15000});
const resp={meta:'panza',sexo:'h',frec:'semana',mejor:'mas',metab:'sube',dias:'4',div:'auto',min:'60',hora:'manana',lugar:'grande',dia:'poco',energia:'almuerzo',sueno:'5',agua:'1',evento:'no',conf:'si'};
const multi={mus:['todos'],mol:['rodilla'],motiv:['verse','salud','fuerte'],probs:['plan']};
const nums={edad:28,altura:172,peso:86};
const shots=[];
for(let k=0;k<40;k++){
  const st=await pg.evaluate(()=>{const c=document.getElementById('cuest');if(!c||c.hidden)return null;return {t:c.querySelector('.cq-t').textContent,cnt:c.querySelector('.cq-cnt').textContent}});
  if(!st)break;
  const f=`${OUT}/p${String(k).padStart(2,'0')}.png`; await pg.screenshot({path:f}); shots.push([f,st.t]);
  const id=await pg.evaluate(()=>{const t=document.querySelector('.cq-t').textContent;return t});
  // decidir respuesta por tipo
  const tipo=await pg.evaluate(()=>document.querySelector('.cq-fig')?'figs':document.querySelector('#cq-in')?'num':document.querySelector('.cq-op')?'op':'info');
  const pid=await pg.evaluate(()=>{const i=JSON.parse(localStorage.getItem('atlas.cuest')||'{}').i||0;return i});
  const ids=['meta','sexo','edad','altura','peso','hoy','cmeta','pobj','frec','mejor','metab','dias','div','min','hora','lugar','mus','mol','motiv','probs','dia','energia','sueno','agua','perfil','evento','proy','conf','fin'];
  const pidn=ids[pid];
  if(tipo==='num'){ if(nums[pidn]!=null){await pg.fill('#cq-in',String(nums[pidn]));} await pg.click('.cq-sig'); }
  else if(tipo==='figs'){ const sel=pidn==='hoy'?'panza':null; if(sel) await pg.click(`.cq-fig[data-v="${sel}"]`); else await pg.click('.cq-fig >> nth=1'); await pg.waitForTimeout(400);}
  else if(tipo==='op'){ if(multi[pidn]){ for(const v of multi[pidn]) await pg.click(`.cq-op[data-v="${v}"]`); await pg.click('.cq-sig'); } else { await pg.click(`.cq-op[data-v="${resp[pidn]}"]`); await pg.waitForTimeout(400);} }
  else { await pg.click('.cq-sig'); }
  await pg.waitForTimeout(150);
}
const perfil=await pg.evaluate(()=>localStorage.getItem('atlas.perfil'));
const tab=await pg.evaluate(()=>S.tab);
await pg.screenshot({path:`${OUT}/final.png`});
console.log(JSON.stringify({pasos:shots.length,perfil:JSON.parse(perfil),tab,errs},null,0).slice(0,1500));
fs.writeFileSync(`${OUT}/shots.json`,JSON.stringify(shots));
await b.close();srv.close();
