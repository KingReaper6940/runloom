import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root=new URL('../',import.meta.url);
const files=new Map([['/','index.html'],['/index.html','index.html'],['/style.css','style.css'],['/favicon.svg','favicon.svg'],...['core','files','example','app'].map(name=>[`/src/${name}.mjs`,`src/${name}.mjs`])]);
const types={html:'text/html; charset=utf-8',css:'text/css',svg:'image/svg+xml',mjs:'text/javascript'};
createServer(async(request,response)=>{
  const path=files.get(new URL(request.url,'http://localhost').pathname);
  if(!path){response.writeHead(404);response.end('Not found');return;}
  try{const body=await readFile(fileURLToPath(new URL(path,root)));response.writeHead(200,{'Content-Type':types[path.split('.').pop()],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(body);}
  catch{response.writeHead(500);response.end('Preview unavailable');}
}).listen(4181,'127.0.0.1',()=>console.log('Runloom preview: http://127.0.0.1:4181'));
