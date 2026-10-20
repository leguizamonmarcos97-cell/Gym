import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const root = process.argv[2], outDir = process.argv[3], names = process.argv.slice(4);
const srv = http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'Content-Type':p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':p.endsWith('.png')?'image/png':'application/json'});r.end(d);});}).listen(8790);
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pg = await b.newPage(); pg.on('console', m => console.log('C', m.text())); pg.on('pageerror', e => console.log('E', e.message));
await pg.goto('http://localhost:8790/'); await pg.waitForFunction(() => window.ready);
for(const n of names){ const url = await pg.evaluate(([n]) => render(n, n[0]), [n]); fs.writeFileSync(`${outDir}/${n}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('ok', n); }
await b.close(); srv.close();
