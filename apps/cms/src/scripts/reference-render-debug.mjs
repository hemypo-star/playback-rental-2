import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { gunzipSync } from 'node:zlib'

const referenceDir=path.resolve(process.cwd(),'../../design_handoff_swiss_bento/reference')
const htmlPath=path.join(referenceDir,'Playback Rental.dc.html')
const supportPath=path.join(referenceDir,'support.js')
const imageSlotPath=path.join(referenceDir,'image-slot.js')
const fontPath=path.resolve(process.cwd(),'public/fonts/golos-text-cyrillic.woff2')
const bundlePath=path.join(referenceDir,'Playback Rental - прокат техники.html')
const port=4173,debug='http://127.0.0.1:9224'

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function chrome(){for(const p of [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'])if(p&&existsSync(p))return p;throw new Error('Chrome not found')}

function bundledRuntime(url){
 const bundled=readFileSync(bundlePath,'utf8')
 const manifestMatch=bundled.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)\s*<\/script>/)
 const extMatch=bundled.match(/<script type="__bundler\/ext_resources">\s*([\s\S]*?)\s*<\/script>/)
 if(!manifestMatch||!extMatch)throw new Error('Bundled manifest not found')
 const manifest=JSON.parse(manifestMatch[1]),ext=JSON.parse(extMatch[1])
 const hit=ext.find(x=>x.id===url)
 if(!hit||!manifest[hit.uuid])throw new Error('Bundled runtime not found: '+url)
 const entry=manifest[hit.uuid]
 const raw=Buffer.from(entry.data,'base64')
 return entry.compressed?gunzipSync(raw):raw
}
async function server(){
 const react=bundledRuntime('https://unpkg.com/react@18.3.1/umd/react.production.min.js')
 const reactDom=bundledRuntime('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js')
 const support=readFileSync(supportPath,'utf8')
 let html=readFileSync(htmlPath,'utf8').replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin="anonymous" \/>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]+" rel="stylesheet" \/>/,'<style>@font-face{font-family:"Golos Text";font-style:normal;font-weight:400 800;src:url("/golos.woff2") format("woff2")}</style>')
 const http=createServer((req,res)=>{const u=new URL(req.url||'/','http://127.0.0.1:'+port);const p=u.pathname
  const send=(type,b)=>{res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(b)}
  if(p==='/'||p==='/Playback%20Rental.dc.html'||p==='/Playback Rental.dc.html')return send('text/html; charset=utf-8',html)
  if(p==='/support.js')return send('text/javascript; charset=utf-8',support)
  if(p==='/image-slot.js')return send('text/javascript; charset=utf-8',readFileSync(imageSlotPath))
  if(p==='/golos.woff2')return send('font/woff2',readFileSync(fontPath))
  res.writeHead(404);res.end('not found')
 })
 await new Promise((ok,fail)=>{http.once('error',fail);http.listen(port,'127.0.0.1',ok)})
 return {http,bootstrap:[react,reactDom].map(x=>x.toString('utf8')).join('\n;\n')}
}
class CDP{constructor(url){this.url=url;this.i=1;this.p=new Map();this.l=new Map()}async open(){this.ws=new WebSocket(this.url);await new Promise((ok,fail)=>{this.ws.onopen=ok;this.ws.onerror=fail});this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const q=this.p.get(m.id);if(!q)return;this.p.delete(m.id);m.error?q.reject(new Error(m.error.message)):q.resolve(m.result||{});return}for(const f of this.l.get(m.method)||[])f(m.params||{})}}send(method,params={}){const id=this.i++;return new Promise((resolve,reject)=>{this.p.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}on(m,f){const a=this.l.get(m)||new Set();a.add(f);this.l.set(m,a)}}
async function main(){
 const srv=await server();const dir=path.join(os.tmpdir(),'pb-ref-'+process.pid);const cp=spawn(chrome(),['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=9224','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']})
 let err='';cp.stderr.on('data',c=>err+=String(c))
 try{
  let version;for(let i=0;i<80&&!version;i++){try{const r=await fetch(debug+'/json/version');if(r.ok)version=await r.json()}catch{}if(!version)await sleep(250)}
  const tr=await fetch(debug+'/json/new?about:blank',{method:'PUT'});const t=await tr.json();const c=new CDP(t.webSocketDebuggerUrl);await c.open()
  await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Log.enable');await c.send('Network.enable');await c.send('Page.addScriptToEvaluateOnNewDocument',{source:srv.bootstrap})
  c.on('Runtime.consoleAPICalled',p=>console.log('CONSOLE',p.type,(p.args||[]).map(a=>a.value||a.description).join(' | ')))
  c.on('Runtime.exceptionThrown',p=>console.log('EXCEPTION',p.exceptionDetails?.exception?.description||p.exceptionDetails?.text))
  c.on('Log.entryAdded',p=>console.log('LOG',p.entry?.level,p.entry?.text))
  c.on('Network.loadingFailed',p=>console.log('NETWORK_FAIL',p.errorText,p.blockedReason||'',p.type||''))
  await c.send('Page.navigate',{url:'http://127.0.0.1:'+port+'/Playback%20Rental.dc.html'})
  let ok=false;for(let i=0;i<80;i++){const r=await c.send('Runtime.evaluate',{expression:"Boolean(document.querySelector('#dc-root'))",returnByValue:true});if(r.result?.value){ok=true;break}await sleep(250)}
  const state=await c.send('Runtime.evaluate',{expression:"({ready:document.readyState,hasRoot:Boolean(document.querySelector('#dc-root')),hasReact:Boolean(window.React),hasReactDOM:Boolean(window.ReactDOM),bodyText:document.body?.innerText?.slice(0,1000)||'',scripts:Array.from(document.scripts).map(s=>s.src||'[inline]')})",returnByValue:true})
  console.log('STATE',JSON.stringify(state.result?.value,null,2))
  if(!ok)throw new Error('reference did not boot')
  const shot=await c.send('Page.captureScreenshot',{format:'png',fromSurface:true});writeFileSync('/tmp/reference-home.png',Buffer.from(shot.data,'base64'));console.log('REFERENCE_OK')
 }finally{cp.kill('SIGTERM');srv.http.close();if(err)console.log('CHROME',err.slice(-3000))}
}
main().catch(e=>{console.error(e);process.exit(1)})
