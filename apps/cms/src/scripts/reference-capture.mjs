import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const referenceDir=path.resolve(process.cwd(),'../../design_handoff_swiss_bento/reference')
const htmlPath=path.join(referenceDir,'Playback Rental.dc.html')
const supportPath=path.join(referenceDir,'support.js')
const imageSlotPath=path.join(referenceDir,'image-slot.js')
const fontPath=path.resolve(process.cwd(),'public/fonts/golos-text-cyrillic.woff2')
const outputDir=path.resolve(process.cwd(),process.env.VISUAL_OUTPUT_DIR||'artifacts/visual-regression')
const port=4173,debug='http://127.0.0.1:9224'
const viewports=[
 {id:'desktop',width:1440,height:900,mobile:false},
 {id:'tablet',width:1024,height:900,mobile:false},
 {id:'mobile',width:375,height:812,mobile:true},
]
const screens=[
 {id:'home',label:'Главная'},
 {id:'catalog',label:'Каталог'},
 {id:'product',label:'Товар'},
 {id:'cart',label:'Корзина'},
 {id:'admin',label:'Админка'},
]

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function chrome(){for(const p of [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'])if(p&&existsSync(p))return p;throw new Error('Chrome not found')}
async function asset(url){const r=await fetch(url);if(!r.ok)throw new Error(url+' -> '+r.status);return Buffer.from(await r.arrayBuffer())}
async function server(){
 const [react,reactDom,babel]=await Promise.all([
  asset('https://unpkg.com/react@18.3.1/umd/react.production.min.js'),
  asset('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'),
  asset('https://unpkg.com/@babel/standalone@7.29.0/babel.min.js')
 ])
 let support=readFileSync(supportPath,'utf8')
 support=support
  .replace('https://unpkg.com/react@18.3.1/umd/react.production.min.js','http://127.0.0.1:'+port+'/react.js')
  .replace('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js','http://127.0.0.1:'+port+'/react-dom.js')
  .replace('https://unpkg.com/@babel/standalone@7.29.0/babel.min.js','http://127.0.0.1:'+port+'/babel.js')
 let html=readFileSync(htmlPath,'utf8').replace(/<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin="anonymous" \/>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]+" rel="stylesheet" \/>/,'<style>@font-face{font-family:"Golos Text";font-style:normal;font-weight:400 800;src:url("/golos.woff2") format("woff2")}</style>')
 const s=createServer((req,res)=>{const u=new URL(req.url||'/','http://127.0.0.1:'+port);const p=u.pathname
  const send=(type,b)=>{res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(b)}
  if(p==='/'||p==='/Playback%20Rental.dc.html'||p==='/Playback Rental.dc.html')return send('text/html; charset=utf-8',html)
  if(p==='/support.js')return send('text/javascript; charset=utf-8',support)
  if(p==='/image-slot.js')return send('text/javascript; charset=utf-8',readFileSync(imageSlotPath))
  if(p==='/react.js')return send('text/javascript; charset=utf-8',react)
  if(p==='/react-dom.js')return send('text/javascript; charset=utf-8',reactDom)
  if(p==='/babel.js')return send('text/javascript; charset=utf-8',babel)
  if(p==='/golos.woff2')return send('font/woff2',readFileSync(fontPath))
  res.writeHead(404);res.end('not found')
 })
 await new Promise((ok,fail)=>{s.once('error',fail);s.listen(port,'127.0.0.1',ok)})
 return s
}
class CDP{constructor(url){this.url=url;this.i=1;this.p=new Map();this.l=new Map()}async open(){this.ws=new WebSocket(this.url);await new Promise((ok,fail)=>{this.ws.onopen=ok;this.ws.onerror=fail});this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const q=this.p.get(m.id);if(!q)return;this.p.delete(m.id);m.error?q.reject(new Error(m.error.message)):q.resolve(m.result||{});return}for(const f of this.l.get(m.method)||[])f(m.params||{})}}send(method,params={}){const id=this.i++;return new Promise((resolve,reject)=>{this.p.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}))})}on(m,f){const a=this.l.get(m)||new Set();a.add(f);this.l.set(m,a)}close(){this.ws?.close()}}
async function evaluate(c,expression){const r=await c.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate failed');return r.result?.value}
async function settle(c){await evaluate(c,"(async()=>{if(document.fonts&&document.fonts.ready)await document.fonts.ready;await Promise.all(Array.from(document.images).map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r})));return true})()");await sleep(200)}
async function setViewport(c,v){await c.send('Emulation.setDeviceMetricsOverride',{width:v.width,height:v.height,deviceScaleFactor:1,mobile:v.mobile});await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})}
async function select(c,label){await evaluate(c,"(()=>{const els=Array.from(document.querySelectorAll('#dc-root div'));const first=els.find(el=>el.textContent&&el.textContent.trim()==='Главная'&&el.parentElement&&getComputedStyle(el.parentElement).position==='fixed');if(first&&first.parentElement)first.parentElement.style.display='';return true})()");const q="(()=>{const label="+JSON.stringify(label)+";const els=Array.from(document.querySelectorAll('#dc-root div'));const item=els.find(el=>el.textContent&&el.textContent.trim()===label&&el.parentElement&&getComputedStyle(el.parentElement).position==='fixed');if(!item)throw new Error('switcher '+label+' not found');item.click();return true})()";await evaluate(c,q);await sleep(80);await evaluate(c,"(()=>{const els=Array.from(document.querySelectorAll('#dc-root div'));const item=els.find(el=>el.textContent&&el.textContent.trim()==='Главная'&&el.parentElement&&getComputedStyle(el.parentElement).position==='fixed');if(item&&item.parentElement)item.parentElement.style.display='none';return true})()");await settle(c)}
async function main(){
 mkdirSync(outputDir,{recursive:true})
 const srv=await server(),dir=path.join(os.tmpdir(),'pb-ref-'+process.pid),cp=spawn(chrome(),['--headless=new','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--remote-debugging-port=9224','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']})
 let err='';cp.stderr.on('data',x=>err+=String(x));let c
 try{
  let version;for(let i=0;i<80&&!version;i++){try{const r=await fetch(debug+'/json/version');if(r.ok)version=await r.json()}catch{}if(!version)await sleep(250)}
  if(!version)throw new Error('Chrome debug endpoint unavailable')
  const tr=await fetch(debug+'/json/new?about:blank',{method:'PUT'}),t=await tr.json();c=new CDP(t.webSocketDebuggerUrl);await c.open()
  await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Log.enable');await c.send('Network.enable')
  c.on('Runtime.consoleAPICalled',p=>console.log('REF_CONSOLE',p.type,(p.args||[]).map(a=>a.value||a.description).join(' | ')))
  c.on('Runtime.exceptionThrown',p=>console.log('REF_EXCEPTION',p.exceptionDetails?.exception?.description||p.exceptionDetails?.text))
  c.on('Network.loadingFailed',p=>console.log('REF_NETWORK_FAIL',p.errorText,p.type||''))
  await c.send('Page.navigate',{url:'http://127.0.0.1:'+port+'/Playback%20Rental.dc.html'})
  let ok=false;for(let i=0;i<80;i++){const r=await c.send('Runtime.evaluate',{expression:"Boolean(document.querySelector('#dc-root'))",returnByValue:true});if(r.result?.value){ok=true;break}await sleep(250)}
  if(!ok){const state=await c.send('Runtime.evaluate',{expression:"({ready:document.readyState,hasRoot:Boolean(document.querySelector('#dc-root')),hasReact:Boolean(window.React),hasReactDOM:Boolean(window.ReactDOM),bodyText:document.body?.innerText?.slice(0,500)||''})",returnByValue:true});console.error('REF_STATE',JSON.stringify(state.result?.value));throw new Error('reference did not boot')}
  for(const v of viewports){await setViewport(c,v);await settle(c);for(const screen of screens){await select(c,screen.label);const shot=await c.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});writeFileSync(path.join(outputDir,screen.id+'-'+v.id+'-reference.png'),Buffer.from(shot.data,'base64'));console.log('REFERENCE_CAPTURED',screen.id,v.id)}}
  console.log('REFERENCE_CAPTURE_OK',viewports.length*screens.length)
 }finally{c?.close();cp.kill('SIGTERM');await sleep(300);srv.close();try{rmSync(dir,{recursive:true,force:true,maxRetries:4,retryDelay:100})}catch{}if(err)console.log('REF_CHROME_TAIL',err.slice(-1500))}
}
main().catch(e=>{console.error(e);process.exit(1)})
