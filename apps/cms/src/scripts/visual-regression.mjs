import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'

const actualBase=process.env.VISUAL_BASE_URL||'http://127.0.0.1:3000'
const referenceDir=path.resolve(process.cwd(),'../../design_handoff_swiss_bento/reference')
const htmlPath=path.join(referenceDir,'Playback Rental.dc.html')
const supportPath=path.join(referenceDir,'support.js')
const imageSlotPath=path.join(referenceDir,'image-slot.js')
const fontPath=path.resolve(process.cwd(),'public/fonts/golos-text-cyrillic.woff2')
const outputDir=path.resolve(process.cwd(),process.env.VISUAL_OUTPUT_DIR||'artifacts/visual-regression')
const port=4173,debug='http://127.0.0.1:9225'
const adminEmail=process.env.SMOKE_ADMIN_EMAIL||'smoke-admin@example.invalid'
const adminPassword=process.env.SMOKE_ADMIN_PASSWORD||'ci-smoke-only-password-2026'

const viewports=[
 {id:'desktop',width:1440,height:900,mobile:false},
 {id:'tablet',width:1024,height:900,mobile:false},
 {id:'mobile',width:375,height:812,mobile:true},
]
const screens=[
 {id:'home',label:'Главная',path:'/'},
 {id:'catalog',label:'Каталог',path:'/catalog'},
 {id:'product',label:'Товар',path:null},
 {id:'cart',label:'Корзина',path:'/checkout'},
 {id:'admin',label:'Админка',path:'/admin/orders'},
]

function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function chrome(){for(const p of [process.env.CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'])if(p&&existsSync(p))return p;throw new Error('Chrome not found')}
async function asset(url){const r=await fetch(url);if(!r.ok)throw new Error(url+' -> '+r.status);return Buffer.from(await r.arrayBuffer())}

async function startReferenceServer(){
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
 const srv=createServer((req,res)=>{const p=new URL(req.url||'/','http://127.0.0.1:'+port).pathname;const send=(type,b)=>{res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(b)}
  if(p==='/'||p==='/Playback%20Rental.dc.html'||p==='/Playback%20Rental.dc.html'.replace(/%20/g,' ')||p==='/Playback Rental.dc.html')return send('text/html; charset=utf-8',html)
  if(p==='/support.js')return send('text/javascript; charset=utf-8',support)
  if(p==='/image-slot.js')return send('text/javascript; charset=utf-8',readFileSync(imageSlotPath))
  if(p==='/react.js')return send('text/javascript; charset=utf-8',react)
  if(p==='/react-dom.js')return send('text/javascript; charset=utf-8',reactDom)
  if(p==='/babel.js')return send('text/javascript; charset=utf-8',babel)
  if(p==='/golos.woff2')return send('font/woff2',readFileSync(fontPath))
  res.writeHead(404);res.end('not found')
 })
 await new Promise((ok,fail)=>{srv.once('error',fail);srv.listen(port,'127.0.0.1',ok)})
 return srv
}

class CDP{
 constructor(url){this.url=url;this.i=1;this.p=new Map();this.l=new Map()}
 async open(){this.ws=new WebSocket(this.url);await new Promise((ok,fail)=>{this.ws.onopen=ok;this.ws.onerror=fail});this.ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const q=this.p.get(m.id);if(!q)return;this.p.delete(m.id);m.error?q.reject(new Error(m.error.message)):q.resolve(m.result||{});return}for(const f of this.l.get(m.method)||[])f(m.params||{})}}
 send(method,params={}){const id=this.i++;return new Promise((resolve,reject)=>{const t=setTimeout(()=>{this.p.delete(id);reject(new Error(method+' timeout'))},30000);this.p.set(id,{resolve:v=>{clearTimeout(t);resolve(v)},reject:e=>{clearTimeout(t);reject(e)}});this.ws.send(JSON.stringify({id,method,params}))})}
 on(m,f){const a=this.l.get(m)||new Set();a.add(f);this.l.set(m,a)}
 close(){this.ws?.close()}
}
async function evalx(c,expression){const r=await c.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text||'evaluate failed');return r.result?.value}
async function waitFor(c,expression,label,timeout=30000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{if(await evalx(c,expression))return}catch(e){last=e}await sleep(200)}throw new Error(label+' timed out'+(last?': '+last.message:''))}
async function viewport(c,v){await c.send('Emulation.setDeviceMetricsOverride',{width:v.width,height:v.height,deviceScaleFactor:1,mobile:v.mobile});await c.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]})}
async function nav(c,url){await c.send('Page.navigate',{url});await waitFor(c,"document.readyState==='complete'",'page load')}
async function settle(c){await evalx(c,"(async()=>{if(document.fonts&&document.fonts.ready)await document.fonts.ready;await Promise.all(Array.from(document.images).map(i=>i.complete?Promise.resolve():new Promise(r=>{i.onload=r;i.onerror=r})));return true})()");await sleep(200)}
async function capture(c,file){const r=await c.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});writeFileSync(file,Buffer.from(r.data,'base64'))}

async function openReference(c,label,v){
 await viewport(c,v)
 await nav(c,'http://127.0.0.1:'+port+'/Playback%20Rental.dc.html')
 await waitFor(c,"Boolean(document.querySelector('#dc-root')) && document.body.innerText.includes('Главная')",'reference boot',30000)
 const pick="(()=>{const label="+JSON.stringify(label)+";const els=Array.from(document.querySelectorAll('#dc-root div'));const item=els.find(el=>el.textContent&&el.textContent.trim()===label&&el.parentElement&&getComputedStyle(el.parentElement).position==='fixed');if(!item)throw new Error('switcher '+label+' not found');item.click();return true})()"
 await evalx(c,pick)
 await sleep(80)
 await evalx(c,"(()=>{const els=Array.from(document.querySelectorAll('#dc-root div'));const item=els.find(el=>el.textContent&&el.textContent.trim()==='Главная'&&el.parentElement&&getComputedStyle(el.parentElement).position==='fixed');if(item&&item.parentElement)item.parentElement.style.display='none';return true})()")
 await settle(c)
}

async function discoverProduct(c,v){await viewport(c,v);await nav(c,new URL('/catalog',actualBase).toString());await waitFor(c,"Boolean(document.querySelector('a[href^=\"/product/\"]'))",'product link');return evalx(c,"document.querySelector('a[href^=\"/product/\"]')?.getAttribute('href')||''")}
async function login(c){const q="(async()=>{const r=await fetch('/api/users/login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:"+JSON.stringify(adminEmail)+",password:"+JSON.stringify(adminPassword)+"})});return r.status})()";const status=await evalx(c,q);if(status!==200)throw new Error('admin login '+status)}
async function seedCart(c,productPath){const id=Number(productPath.split('/').pop());const q="(()=>{const s=new Date(Date.now()+7*86400000);s.setHours(11,0,0,0);const e=new Date(s.getTime()+2*86400000);e.setHours(18,0,0,0);localStorage.setItem('pb:cart',JSON.stringify([{productId:"+id+",title:'Smoke Camera Alpha',price:1500,listingType:'rental',unit:'смена / 24 часа',quantity:1},{productId:"+id+",title:'GoPro HERO13 Black',price:1200,listingType:'rental',unit:'смена / 24 часа',quantity:2}]));sessionStorage.setItem('pb:selectedDates',JSON.stringify({startDate:s.toISOString(),endDate:e.toISOString()}));return true})()";await evalx(c,q)}
async function openActual(c,screen,productPath,v){
 await viewport(c,v)
 if(screen.id==='cart'){await nav(c,new URL('/catalog',actualBase).toString());await seedCart(c,productPath)}
 if(screen.id==='admin'){await nav(c,new URL('/',actualBase).toString());await login(c)}
 const target=screen.id==='product'?productPath:screen.path
 await nav(c,new URL(target,actualBase).toString())
 await waitFor(c,"document.body && document.body.innerText.trim().length>20",'actual screen')
 await settle(c)
}

async function compare(refFile,actualFile,diffFile){
 const r=await sharp(refFile).removeAlpha().raw().toBuffer({resolveWithObject:true})
 const a=await sharp(actualFile).removeAlpha().raw().toBuffer({resolveWithObject:true})
 if(r.info.width!==a.info.width||r.info.height!==a.info.height)throw new Error('size mismatch')
 const px=r.info.width*r.info.height,d=Buffer.alloc(px*4);let exact=0,meaningful=0,total=0
 for(let p=0;p<px;p++){const i=p*3,j=p*4,dr=Math.abs(r.data[i]-a.data[i]),dg=Math.abs(r.data[i+1]-a.data[i+1]),db=Math.abs(r.data[i+2]-a.data[i+2]),mx=Math.max(dr,dg,db),sum=dr+dg+db;if(sum)exact++;if(mx>16)meaningful++;total+=sum;const lum=Math.round((r.data[i]+r.data[i+1]+r.data[i+2])/3);if(mx>16){d[j]=255;d[j+1]=0;d[j+2]=0;d[j+3]=255}else{d[j]=lum;d[j+1]=lum;d[j+2]=lum;d[j+3]=110}}
 await sharp(d,{raw:{width:r.info.width,height:r.info.height,channels:4}}).png().toFile(diffFile)
 return {exactMismatchPercent:+(exact/px*100).toFixed(3),meaningfulMismatchPercent:+(meaningful/px*100).toFixed(3),meanChannelDelta:+(total/(px*3)).toFixed(3)}
}

async function main(){
 rmSync(outputDir,{recursive:true,force:true});mkdirSync(outputDir,{recursive:true})
 const srv=await startReferenceServer(),dir=path.join(os.tmpdir(),'pb-visual-'+process.pid),cp=spawn(chrome(),['--headless=new','--no-sandbox','--disable-dev-shm-usage','--hide-scrollbars','--remote-debugging-port=9225','--user-data-dir='+dir,'about:blank'],{stdio:['ignore','ignore','pipe']})
 let stderr='';cp.stderr.on('data',x=>stderr+=String(x));let c
 try{
  let version;for(let i=0;i<100&&!version;i++){try{const r=await fetch(debug+'/json/version');if(r.ok)version=await r.json()}catch{}if(!version)await sleep(200)}
  if(!version)throw new Error('Chrome debug endpoint unavailable')
  const tr=await fetch(debug+'/json/new?about:blank',{method:'PUT'}),t=await tr.json();c=new CDP(t.webSocketDebuggerUrl);await c.open();await c.send('Page.enable');await c.send('Runtime.enable');await c.send('Network.enable')
  c.on('Runtime.exceptionThrown',p=>console.error('PAGE_EXCEPTION',p.exceptionDetails?.exception?.description||p.exceptionDetails?.text))
  c.on('Network.loadingFailed',p=>console.error('NETWORK_FAIL',p.errorText,p.type||''))
  let productPath='';const report={reference:'design_handoff_swiss_bento/reference/Playback Rental.dc.html',actualBase,generatedAt:new Date().toISOString(),metrics:[]}
  for(const v of viewports){if(!productPath)productPath=await discoverProduct(c,v);for(const screen of screens){const stem=screen.id+'-'+v.id,rf=path.join(outputDir,stem+'-reference.png'),af=path.join(outputDir,stem+'-actual.png'),df=path.join(outputDir,stem+'-diff.png');await openReference(c,screen.label,v);await capture(c,rf);await openActual(c,screen,productPath,v);await capture(c,af);const m=await compare(rf,af,df);report.metrics.push({screen:screen.id,viewport:v.id,...m});console.log('VISUAL',screen.id,v.id,JSON.stringify(m))}}
  writeFileSync(path.join(outputDir,'report.json'),JSON.stringify(report,null,2))
  const rows=report.metrics.map(m=>'| '+m.screen+' | '+m.viewport+' | '+m.exactMismatchPercent+'% | '+m.meaningfulMismatchPercent+'% | '+m.meanChannelDelta+' |')
  writeFileSync(path.join(outputDir,'report.md'),['# Visual regression report','','| Screen | Viewport | Exact mismatch | Meaningful mismatch | Mean RGB delta |','|---|---|---:|---:|---:|',...rows,''].join('\n'))
  console.log('VISUAL_REGRESSION_OK',report.metrics.length)
 }finally{c?.close();cp.kill('SIGTERM');srv.close();rmSync(dir,{recursive:true,force:true});if(stderr)console.log('CHROME_TAIL',stderr.slice(-1500))}
}
main().catch(e=>{console.error('VISUAL_REGRESSION_FAILED',e);process.exit(1)})
