import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import sharp from 'sharp'

const actualBase = process.env.VISUAL_BASE_URL || 'http://127.0.0.1:3000'
const adminEmail = process.env.SMOKE_ADMIN_EMAIL
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD
const referenceDir = path.resolve(process.cwd(), '../../design_handoff_swiss_bento/reference')
const referenceHtmlPath = path.join(referenceDir, 'Playback Rental.dc.html')
const supportPath = path.join(referenceDir, 'support.js')
const imageSlotPath = path.join(referenceDir, 'image-slot.js')
const fontPath = path.resolve(process.cwd(), 'public/fonts/golos-text-cyrillic.woff2')
const outputDir = path.resolve(process.cwd(), process.env.VISUAL_OUTPUT_DIR || 'artifacts/visual-regression')
const baselineDir = path.resolve(process.cwd(), 'visual-baselines')
const referencePort = 4173
const debugBase = 'http://127.0.0.1:9225'

const viewports = [
  { id: 'desktop', width: 1440, height: 900, mobile: false },
  { id: 'tablet', width: 1024, height: 900, mobile: false },
  { id: 'mobile', width: 375, height: 812, mobile: true },
]

const screens = [
  { id: 'home', label: 'Главная', path: '/' },
  { id: 'catalog', label: 'Каталог', path: '/catalog' },
  { id: 'product', label: 'Товар', path: null },
  { id: 'cart', label: 'Корзина', path: '/checkout' },
  { id: 'admin', label: 'Админка', path: '/admin/orders' },
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findChrome() {
  for (const candidate of [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]) {
    if (candidate && existsSync(candidate)) return candidate
  }
  throw new Error('Headless Chrome not found')
}

async function fetchBytes(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(url + ' -> ' + response.status)
  return Buffer.from(await response.arrayBuffer())
}

async function startReferenceServer() {
  const [react, reactDom, babel] = await Promise.all([
    fetchBytes('https://unpkg.com/react@18.3.1/umd/react.production.min.js'),
    fetchBytes('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'),
    fetchBytes('https://unpkg.com/@babel/standalone@7.29.0/babel.min.js'),
  ])

  const html = readFileSync(referenceHtmlPath, 'utf8').replace(
    /<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin="anonymous" \/>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]+" rel="stylesheet" \/>/,
    '<style>@font-face{font-family:"Golos Text";font-style:normal;font-weight:400 800;font-display:swap;src:url("/golos.woff2") format("woff2")}</style>',
  )
  const support = readFileSync(supportPath, 'utf8')
    .replace('https://unpkg.com/react@18.3.1/umd/react.production.min.js', 'http://127.0.0.1:' + referencePort + '/react.js')
    .replace('https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', 'http://127.0.0.1:' + referencePort + '/react-dom.js')
    .replace('https://unpkg.com/@babel/standalone@7.29.0/babel.min.js', 'http://127.0.0.1:' + referencePort + '/babel.js')
  const imageSlot = readFileSync(imageSlotPath)

  const http = createServer((req, res) => {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1:' + referencePort).pathname
    const send = (type, body) => {
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
      res.end(body)
    }

    if (pathname === '/' || pathname === '/Playback%20Rental.dc.html' || pathname === '/Playback Rental.dc.html') {
      return send('text/html; charset=utf-8', html)
    }
    if (pathname === '/support.js') return send('text/javascript; charset=utf-8', support)
    if (pathname === '/image-slot.js') return send('text/javascript; charset=utf-8', imageSlot)
    if (pathname === '/react.js') return send('text/javascript; charset=utf-8', react)
    if (pathname === '/react-dom.js') return send('text/javascript; charset=utf-8', reactDom)
    if (pathname === '/babel.js') return send('text/javascript; charset=utf-8', babel)
    if (pathname === '/golos.woff2') return send('font/woff2', readFileSync(fontPath))

    res.writeHead(404)
    res.end('not found')
  })

  await new Promise((resolve, reject) => {
    http.once('error', reject)
    http.listen(referencePort, '127.0.0.1', resolve)
  })

  return {
    http,
    bootstrap: [react, reactDom, babel].map((asset) => asset.toString('utf8')).join('\n;\n'),
  }
}

class CdpSession {
  constructor(url) {
    this.url = url
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
  }

  async open() {
    this.ws = new WebSocket(this.url)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP open timeout')), 10000)
      this.ws.onopen = () => {
        clearTimeout(timer)
        resolve()
      }
      this.ws.onerror = (event) => {
        clearTimeout(timer)
        reject(event.error || new Error('CDP websocket error'))
      }
    })

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        clearTimeout(pending.timer)
        if (message.error) pending.reject(new Error(pending.method + ': ' + message.error.message))
        else pending.resolve(message.result || {})
        return
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {})
    }
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(method + ' timeout'))
      }, 30000)
      this.pending.set(id, { resolve, reject, timer, method })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, listener) {
    const set = this.listeners.get(method) || new Set()
    set.add(listener)
    this.listeners.set(method, set)
    return () => set.delete(listener)
  }

  once(method, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      let off = () => {}
      const timer = setTimeout(() => {
        off()
        reject(new Error(method + ' event timeout'))
      }, timeoutMs)
      off = this.on(method, (params) => {
        clearTimeout(timer)
        off()
        resolve(params)
      })
    })
  }

  close() {
    this.ws?.close()
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  })
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed')
  }
  return result.result?.value
}

async function waitFor(cdp, expression, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      if (await evaluate(cdp, expression)) return
    } catch (error) {
      lastError = error
    }
    await sleep(200)
  }
  throw new Error(label + ' timed out' + (lastError ? ': ' + lastError.message : ''))
}

async function setViewport(cdp, viewport, motion = 'reduce') {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  })
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: motion }],
  })
}

async function navigate(cdp, url) {
  const loaded = cdp.once('Page.loadEventFired')
  await cdp.send('Page.navigate', { url })
  await loaded
}

async function settle(cdp) {
  await evaluate(
    cdp,
    "(async()=>{if(document.fonts?.ready)await document.fonts.ready;await Promise.all(Array.from(document.images).map(img=>img.complete?Promise.resolve():new Promise(r=>{img.addEventListener('load',r,{once:true});img.addEventListener('error',r,{once:true})})));return true})()",
  )
  await sleep(180)
}

async function capture(cdp, file) {
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  })
  writeFileSync(file, Buffer.from(result.data, 'base64'))
}

async function openReference(cdp, screen, viewport) {
  await setViewport(cdp, viewport)
  await navigate(cdp, 'http://127.0.0.1:' + referencePort + '/Playback%20Rental.dc.html')
  await waitFor(
    cdp,
    "Boolean(document.querySelector('#dc-root'))",
    'reference boot',
  )

  const clickExpression =
    "(()=>{const label=" +
    JSON.stringify(screen.label) +
    ";const els=Array.from(document.querySelectorAll('#dc-root div'));const item=els.find(el=>el.textContent?.trim()===label&&el.parentElement&&getComputedStyle(el.parentElement).position==='fixed');if(!item)throw new Error('switcher item not found: '+label);item.click();return true})()"
  await evaluate(cdp, clickExpression)

  await evaluate(
    cdp,
    "(()=>{const els=Array.from(document.querySelectorAll('#dc-root div'));const item=els.find(el=>el.textContent?.trim()==='Главная'&&el.parentElement&&getComputedStyle(el.parentElement).position==='fixed');if(item?.parentElement)item.parentElement.style.display='none';return true})()",
  )

  await settle(cdp)
}

async function discoverVisualProducts(cdp, viewport) {
  await setViewport(cdp, viewport)
  await navigate(cdp, new URL('/catalog', actualBase).toString())
  await waitFor(cdp, "Boolean(document.querySelector('a[href^=\\\"/product/\\\"]'))", 'actual product links')
  return evaluate(
    cdp,
    "(()=>{const links=Array.from(document.querySelectorAll('a[href^=\\\"/product/\\\"]'));const find=(title)=>{const link=links.find((a)=>a.textContent?.includes(title));if(!link)return null;const href=link.getAttribute('href')||'';const id=Number(href.split('/').pop());return Number.isInteger(id)?{id,href}:null};return {sony:find('Sony A7S III'),gopro:find('GoPro HERO13 Black')}})()",
  )
}

function visualStateValues(products) {
  if (!products?.sony?.id || !products?.gopro?.id) {
    throw new Error('Visual products not found: ' + JSON.stringify(products))
  }
  return {
    cart: JSON.stringify([
      {productId:products.sony.id,title:'Sony A7S III',subtitle:'Полный кадр · 4K 120p',price:3500,listingType:'rental',unit:'смена',quantity:1},
      {productId:products.gopro.id,title:'GoPro HERO13 Black',subtitle:'Экшн · 5.3K 60p',price:1200,listingType:'rental',unit:'смена',quantity:2},
    ]),
    dates: JSON.stringify({
      startDate:'2026-08-13T11:00:00.000Z',
      endDate:'2026-08-15T18:00:00.000Z',
    }),
  }
}

async function seedVisualBrowserStorage(cdp, products) {
  const values = visualStateValues(products)
  // Establish a same-origin frame without loading any storefront modules.
  // This makes sessionStorage available while keeping nanostores uninitialized.
  await navigate(cdp, new URL('/api/access', actualBase).toString())
  await evaluate(
    cdp,
    "(()=>{localStorage.setItem('pb:cart'," +
      JSON.stringify(values.cart) +
      ");sessionStorage.setItem('pb:selectedDates'," +
      JSON.stringify(values.dates) +
      ");return {cart:localStorage.getItem('pb:cart'),dates:sessionStorage.getItem('pb:selectedDates')}})()",
  )
}
async function adminCookies() {
  if (!adminEmail || !adminPassword) throw new Error('SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required')
  const response = await fetch(new URL('/api/users/login', actualBase), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  if (!response.ok) throw new Error('admin login failed: ' + response.status)
  return typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean)
}

async function applyCookies(cdp, cookies) {
  for (const cookie of cookies) {
    const first = cookie.split(';', 1)[0]
    const index = first.indexOf('=')
    if (index <= 0) continue
    await cdp.send('Network.setCookie', {
      name: first.slice(0, index),
      value: first.slice(index + 1),
      url: actualBase,
    })
  }
}

function expectMotion(actual, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    if (actual?.[key] !== value) {
      throw new Error('motion mismatch ' + label + ' ' + key + ': expected ' + value + ', got ' + actual?.[key])
    }
  }
  console.log('MOTION ' + label + ' ' + JSON.stringify(actual))
}

async function verifyStateDrivenMotion(cdp) {
  await setViewport(cdp, viewports[0], 'no-preference')
  await navigate(cdp, new URL('/checkout', actualBase).toString())
  await waitFor(cdp, "Boolean(document.querySelector('.pb-cart-line .pb-qty'))&&Boolean(document.querySelector('.pb-cart-count'))", 'motion state checkout')

  const before = await evaluate(
    cdp,
    "(()=>{const line=document.querySelector('.pb-cart-line');const qty=line?.querySelector('.pb-pop-value');const badge=document.querySelector('.pb-cart-count');const total=document.querySelector('.pb-summary .pb-pop-value');if(!qty||!badge||!total)throw new Error('state motion elements missing');qty.__motionMarker='old';badge.__motionMarker='old';total.__motionMarker='old';return {qty:Number(qty.textContent),badge:Number(badge.textContent),total:total.textContent}})()",
  )

  await evaluate(
    cdp,
    "(()=>{const plus=document.querySelector('.pb-cart-line .pb-qty button:last-child');if(!plus)throw new Error('quantity increment missing');plus.click();return true})()",
  )
  await waitFor(
    cdp,
    "(()=>{const qty=document.querySelector('.pb-cart-line .pb-qty .pb-pop-value');return qty&&Number(qty.textContent)>" + before.qty + "})()",
    'motion quantity state update',
  )

  const after = await evaluate(
    cdp,
    "(()=>{const qty=document.querySelector('.pb-cart-line .pb-qty .pb-pop-value');const badge=document.querySelector('.pb-cart-count');const total=document.querySelector('.pb-summary .pb-pop-value');return {qty:Number(qty?.textContent),badge:Number(badge?.textContent),total:total?.textContent||'',qtyRemounted:qty?.__motionMarker!=='old',badgeRemounted:badge?.__motionMarker!=='old',totalRemounted:total?.__motionMarker!=='old',qtyAnimation:getComputedStyle(qty).animationName,badgeAnimation:getComputedStyle(badge).animationName,totalAnimation:getComputedStyle(total).animationName}})()",
  )
  if (
    after.qty !== before.qty + 1 ||
    after.badge !== before.badge + 1 ||
    after.total === before.total ||
    !after.qtyRemounted ||
    !after.badgeRemounted ||
    !after.totalRemounted
  ) {
    throw new Error('state motion remount mismatch: ' + JSON.stringify({ before, after }))
  }
  expectMotion(after, {
    qtyAnimation: 'pbPop',
    badgeAnimation: 'pbPop',
    totalAnimation: 'pbPop',
  }, 'state-pop')

  await evaluate(
    cdp,
    "(()=>{const checkbox=document.querySelector('.pb-consent input');if(!checkbox)throw new Error('consent checkbox missing');checkbox.click();return true})()",
  )
  await waitFor(cdp, "Boolean(document.querySelector('.pb-consent input')?.checked)", 'motion consent state update')
  await sleep(360)
  const consent = await evaluate(
    cdp,
    "(()=>{const checkbox=document.querySelector('.pb-consent input');const style=getComputedStyle(checkbox);return {checked:checkbox.checked,transform:style.transform,transitionDuration:style.transitionDuration,transitionTiming:style.transitionTimingFunction}})()",
  )
  if (!consent.checked || consent.transform === 'none') {
    throw new Error('consent spring state mismatch: ' + JSON.stringify(consent))
  }
  expectMotion(consent, {
    transitionDuration: '0.24s, 0.24s, 0.32s',
    transitionTiming: 'ease, ease, cubic-bezier(0.34, 1.56, 0.64, 1)',
  }, 'state-consent')

  console.log('MOTION state-driven ok ' + JSON.stringify({ before, after, consent }))
}

async function verifyBackForwardMotion(cdp) {
  await navigate(cdp, new URL('/', actualBase).toString())
  await waitFor(cdp, "Boolean(document.querySelector('a[href=\"/catalog\"]'))", 'motion back-forward home link')
  await evaluate(
    cdp,
    "(()=>{const link=Array.from(document.querySelectorAll('a[href=\"/catalog\"]')).find(a=>a.offsetParent!==null);if(!link)throw new Error('visible catalog link missing');link.click();return true})()",
  )
  await waitFor(cdp, "location.pathname==='/catalog'&&Boolean(document.querySelector('.pb-product-card'))", 'motion forward catalog')
  await evaluate(cdp, "history.back();true")
  await waitFor(cdp, "location.pathname==='/'&&Boolean(document.querySelector('.pb-hero-copy'))", 'motion browser back home')
  await waitFor(cdp, "document.documentElement.getAttribute('data-nav-back')==='true'", 'motion browser back flag')
  const back = await evaluate(
    cdp,
    "(()=>{const hero=getComputedStyle(document.querySelector('.pb-hero-copy'));const media=getComputedStyle(document.querySelector('.pb-hero-media'));const rule=getComputedStyle(document.querySelector('.pb-rule'));return {flag:document.documentElement.getAttribute('data-nav-back'),heroAnimation:hero.animationName,mediaAnimation:media.animationName,ruleAnimation:rule.animationName}})()",
  )
  expectMotion(back, {
    flag: 'true',
    heroAnimation: 'none',
    mediaAnimation: 'none',
    ruleAnimation: 'none',
  }, 'back-forward')

  await evaluate(
    cdp,
    "(()=>{const link=Array.from(document.querySelectorAll('a[href=\"/catalog\"]')).find(a=>a.offsetParent!==null);if(!link)throw new Error('visible catalog link missing after back');link.click();return true})()",
  )
  await waitFor(cdp, "location.pathname==='/catalog'&&Boolean(document.querySelector('.pb-product-card'))", 'motion new navigation after back')
  await waitFor(cdp, "!document.documentElement.hasAttribute('data-nav-back')", 'motion back flag cleared')
  console.log('MOTION back-forward-clear ok')
}

async function verifyActualMotion(cdp, productPath) {
  const viewport = viewports[0]
  await setViewport(cdp, viewport, 'no-preference')

  await navigate(cdp, new URL('/', actualBase).toString())
  await waitFor(cdp, "Boolean(document.querySelector('.pb-hero-copy'))", 'motion home')
  const home = await evaluate(
    cdp,
    "(()=>{const pick=(s)=>{const el=document.querySelector(s);return el?getComputedStyle(el):null};const hero=pick('.pb-hero-copy');const media=pick('.pb-hero-media');const dot=pick('.pb-hours-dot');const badge=pick('.pb-cart-count');const marquee=pick('.pb-marquee-track');return {heroDuration:hero?.animationDuration||'',heroTiming:hero?.animationTimingFunction||'',mediaDuration:media?.animationDuration||'',mediaDelay:media?.animationDelay||'',dotDuration:dot?.animationDuration||'',dotIteration:dot?.animationIterationCount||'',badgeDuration:badge?.animationDuration||'',marqueeDuration:marquee?.animationDuration||'',marqueeTiming:marquee?.animationTimingFunction||'',marqueeIteration:marquee?.animationIterationCount||''}})()",
  )
  expectMotion(home, {
    heroDuration: '0.56s',
    heroTiming: 'cubic-bezier(0.16, 1, 0.3, 1)',
    mediaDuration: '0.9s',
    mediaDelay: '0.12s',
    dotDuration: '2.6s',
    dotIteration: 'infinite',
    badgeDuration: '0.38s',
    marqueeDuration: '40s',
    marqueeTiming: 'linear',
    marqueeIteration: 'infinite',
  }, 'home')

  await navigate(cdp, new URL('/catalog', actualBase).toString())
  await waitFor(cdp, "Boolean(document.querySelector('.pb-product-card'))", 'motion catalog')
  const catalog = await evaluate(
    cdp,
    "(()=>{const card=getComputedStyle(document.querySelector('.pb-product-card'));const knob=getComputedStyle(document.querySelector('.pb-switch span'));return {cardDuration:card.animationDuration,cardTiming:card.animationTimingFunction,knobDuration:knob.transitionDuration,knobTiming:knob.transitionTimingFunction}})()",
  )
  expectMotion(catalog, {
    cardDuration: '0.56s',
    cardTiming: 'cubic-bezier(0.16, 1, 0.3, 1)',
    knobDuration: '0.32s',
    knobTiming: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  }, 'catalog')

  await waitFor(cdp, "Boolean(document.querySelector('.pb-page-head .pb-header-date'))", 'motion compact date trigger')
  await evaluate(cdp, "(()=>{const button=document.querySelector('.pb-page-head .pb-header-date');if(!button)throw new Error('compact date trigger missing');button.click();return true})()")
  await waitFor(cdp, "Boolean(document.querySelector('.pb-modal'))", 'motion date picker modal')
  const modal = await evaluate(
    cdp,
    "(()=>{const panel=getComputedStyle(document.querySelector('.pb-modal'));const close=getComputedStyle(document.querySelector('.pb-modal-close'));const day=getComputedStyle(document.querySelector('.pb-day'));return {panelDuration:panel.animationDuration,panelTiming:panel.animationTimingFunction,closeDuration:close.transitionDuration,dayDuration:day.transitionDuration,dayTiming:day.transitionTimingFunction}})()",
  )
  expectMotion(modal, {
    panelDuration: '0.56s',
    panelTiming: 'cubic-bezier(0.16, 1, 0.3, 1)',
    closeDuration: '0.24s, 0.24s, 0.32s',
    dayDuration: '0.24s, 0.24s, 0.32s',
    dayTiming: 'ease, ease, cubic-bezier(0.34, 1.56, 0.64, 1)',
  }, 'modal')

  await navigate(cdp, new URL(productPath, actualBase).toString())
  await waitFor(cdp, "Boolean(document.querySelector('.pb-product-hero'))", 'motion product')
  const product = await evaluate(
    cdp,
    "(()=>{const heroEl=document.querySelector('.pb-product-hero');const hero=getComputedStyle(heroEl);const visual=heroEl?.firstElementChild;const visualStyle=visual?getComputedStyle(visual):null;return {heroDuration:hero.animationDuration,heroTiming:hero.animationTimingFunction,imageDuration:visualStyle?.transitionDuration||''}})()",
  )
  expectMotion(product, {
    heroDuration: '0.9s',
    heroTiming: 'cubic-bezier(0.16, 1, 0.3, 1)',
    imageDuration: '0.9s',
  }, 'product')

  await navigate(cdp, new URL('/checkout', actualBase).toString())
  await waitFor(cdp, "Boolean(document.querySelector('.pb-cart-line'))", 'motion checkout')
  const checkout = await evaluate(
    cdp,
    "(()=>{const row=getComputedStyle(document.querySelector('.pb-cart-line'));const qty=getComputedStyle(document.querySelector('.pb-qty button'));const consent=getComputedStyle(document.querySelector('.pb-consent input'));const pop=getComputedStyle(document.querySelector('.pb-pop-value'));return {rowDuration:row.animationDuration,rowTiming:row.animationTimingFunction,qtyDuration:qty.transitionDuration,consentDuration:consent.transitionDuration,consentTiming:consent.transitionTimingFunction,popDuration:pop.animationDuration,popTiming:pop.animationTimingFunction}})()",
  )
  expectMotion(checkout, {
    rowDuration: '0.56s',
    rowTiming: 'cubic-bezier(0.16, 1, 0.3, 1)',
    qtyDuration: '0.22s, 0.24s',
    consentDuration: '0.24s, 0.24s, 0.32s',
    consentTiming: 'ease, ease, cubic-bezier(0.34, 1.56, 0.64, 1)',
    popDuration: '0.38s',
    popTiming: 'cubic-bezier(0.16, 1, 0.3, 1)',
  }, 'checkout')

  await applyCookies(cdp, await adminCookies())
  await navigate(cdp, new URL('/admin/orders', actualBase).toString())
  await waitFor(cdp, "Boolean(document.querySelector('.pb-admin-shell'))", 'motion admin')
  const admin = await evaluate(
    cdp,
    "(()=>{const shell=getComputedStyle(document.querySelector('.pb-admin-shell'));const kpi=document.querySelector('.pb-admin-kpis > div');const kpiStyle=kpi?getComputedStyle(kpi):null;const action=document.querySelector('a[href=\"/admin/orders/new\"]');const actionStyle=action?getComputedStyle(action):null;return {shellDuration:shell.animationDuration,kpiDuration:kpiStyle?.animationDuration||'',kpiTiming:kpiStyle?.animationTimingFunction||'',actionDuration:actionStyle?.transitionDuration||'',actionTiming:actionStyle?.transitionTimingFunction||''}})()",
  )
  expectMotion(admin, {
    shellDuration: '0.38s',
    kpiDuration: '0.56s',
    kpiTiming: 'cubic-bezier(0.16, 1, 0.3, 1)',
    actionDuration: '0.24s, 0.38s',
    actionTiming: 'ease, cubic-bezier(0.16, 1, 0.3, 1)',
  }, 'admin')
}

async function openActual(cdp, screen, viewport, productPath) {
  await setViewport(cdp, viewport)
  if (screen.id === 'admin') await applyCookies(cdp, await adminCookies())

  const target = screen.id === 'product' ? productPath : screen.path
  await navigate(cdp, new URL(target, actualBase).toString())
  await waitFor(cdp, "document.body&&document.body.innerText.trim().length>20", 'actual ' + screen.id)
  if (screen.id === 'cart') {
    const checkoutState = await evaluate(
      cdp,
      "({path:location.pathname,cartStorage:localStorage.getItem('pb:cart'),dateStorage:sessionStorage.getItem('pb:selectedDates'),cartBadge:document.querySelector('.pb-cart-count')?.textContent||null,body:document.body.innerText.slice(0,1800)})",
    )
    console.log('VISUAL_CHECKOUT_STATE ' + JSON.stringify(checkoutState))
    await waitFor(
      cdp,
      "document.body.innerText.includes('Sony A7S III')&&document.body.innerText.includes('GoPro HERO13 Black')",
      'visual checkout cart hydration',
    )
  }
  await settle(cdp)
}
async function compare(referenceFile, actualFile, diffFile) {
  const reference = await sharp(referenceFile).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const actual = await sharp(actualFile).removeAlpha().raw().toBuffer({ resolveWithObject: true })

  if (reference.info.width !== actual.info.width || reference.info.height !== actual.info.height) {
    throw new Error(
      'screenshot size mismatch: ' +
        reference.info.width +
        'x' +
        reference.info.height +
        ' vs ' +
        actual.info.width +
        'x' +
        actual.info.height,
    )
  }

  const pixels = reference.info.width * reference.info.height
  const diff = Buffer.alloc(pixels * 4)
  let exact = 0
  let meaningful = 0
  let totalDelta = 0

  for (let pixel = 0; pixel < pixels; pixel++) {
    const i = pixel * 3
    const j = pixel * 4
    const dr = Math.abs(reference.data[i] - actual.data[i])
    const dg = Math.abs(reference.data[i + 1] - actual.data[i + 1])
    const db = Math.abs(reference.data[i + 2] - actual.data[i + 2])
    const max = Math.max(dr, dg, db)
    const sum = dr + dg + db

    if (sum > 0) exact++
    if (max > 16) meaningful++
    totalDelta += sum

    const luminance = Math.round((reference.data[i] + reference.data[i + 1] + reference.data[i + 2]) / 3)
    if (max > 16) {
      diff[j] = 255
      diff[j + 1] = 0
      diff[j + 2] = 0
      diff[j + 3] = 255
    } else {
      diff[j] = luminance
      diff[j + 1] = luminance
      diff[j + 2] = luminance
      diff[j + 3] = 90
    }
  }

  await sharp(diff, {
    raw: { width: reference.info.width, height: reference.info.height, channels: 4 },
  })
    .png()
    .toFile(diffFile)

  return {
    width: reference.info.width,
    height: reference.info.height,
    exactMismatchPercent: Number(((exact / pixels) * 100).toFixed(4)),
    meaningfulMismatchPercent: Number(((meaningful / pixels) * 100).toFixed(4)),
    meanChannelDelta: Number((totalDelta / (pixels * 3)).toFixed(4)),
  }
}

async function main() {
  rmSync(outputDir, { recursive: true, force: true })
  mkdirSync(outputDir, { recursive: true })

  const reference = await startReferenceServer()
  const userDataDir = path.join(os.tmpdir(), 'pb-visual-' + process.pid)
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--remote-debugging-port=9225',
      '--user-data-dir=' + userDataDir,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )

  let chromeStderr = ''
  chrome.stderr.on('data', (chunk) => {
    chromeStderr += String(chunk)
    if (chromeStderr.length > 20000) chromeStderr = chromeStderr.slice(-20000)
  })

  let referenceCdp
  let actualCdp
  try {
    let version
    for (let attempt = 0; attempt < 100 && !version; attempt++) {
      try {
        const response = await fetch(debugBase + '/json/version')
        if (response.ok) version = await response.json()
      } catch {}
      if (!version) await sleep(200)
    }
    if (!version) throw new Error('Chrome CDP not ready')

    // Phase 1: render all prototype references first, matching the proven
    // standalone diagnostic sequence exactly.
    const referenceTargetResponse = await fetch(debugBase + '/json/new?about:blank', { method: 'PUT' })
    const referenceTarget = await referenceTargetResponse.json()
    referenceCdp = new CdpSession(referenceTarget.webSocketDebuggerUrl)
    await referenceCdp.open()
    await referenceCdp.send('Page.enable')
    await referenceCdp.send('Runtime.enable')
    await referenceCdp.send('Log.enable')
    await referenceCdp.send('Network.enable')
    await referenceCdp.send('Page.addScriptToEvaluateOnNewDocument', { source: reference.bootstrap })

    const referenceErrors = []
    referenceCdp.on('Runtime.exceptionThrown', (params) => {
      referenceErrors.push('EXCEPTION ' + (params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || ''))
    })
    referenceCdp.on('Log.entryAdded', (params) => {
      if (params.entry?.level === 'error') referenceErrors.push('LOG ' + params.entry.text)
    })

    const referenceFiles = new Map()
    for (const viewport of viewports) {
      for (const screen of screens) {
        const stem = screen.id + '-' + viewport.id
        const referenceFile = path.join(outputDir, stem + '-reference.png')
        const baselineFile = path.join(baselineDir, stem + '-reference.png')
        if (!existsSync(baselineFile)) throw new Error('visual baseline missing: ' + baselineFile)
        await openReference(referenceCdp, screen, viewport)
        await capture(referenceCdp, referenceFile)
        referenceFiles.set(stem, referenceFile)
        const driftFile = path.join(outputDir, stem + '-prototype-drift.png')
        const drift = await compare(baselineFile, referenceFile, driftFile)
        console.log(
          'BASELINE ' +
            screen.id +
            '/' +
            viewport.id +
            ' drift=' +
            drift.meaningfulMismatchPercent +
            '% exact=' +
            drift.exactMismatchPercent +
            '%',
        )
        console.log('REFERENCE ' + screen.id + '/' + viewport.id + ' captured')
      }
    }
    referenceCdp.close()
    referenceCdp = null

    // Phase 2a: discover dynamic product IDs in an isolated target. This
    // target intentionally never becomes the screenshot target because
    // importing the storefront here initializes its nanostores.
    const discoveryTargetResponse = await fetch(debugBase + '/json/new?about:blank', { method: 'PUT' })
    const discoveryTarget = await discoveryTargetResponse.json()
    const discoveryCdp = new CdpSession(discoveryTarget.webSocketDebuggerUrl)
    await discoveryCdp.open()
    await discoveryCdp.send('Page.enable')
    await discoveryCdp.send('Runtime.enable')
    const visualProducts = await discoverVisualProducts(discoveryCdp, viewports[0])
    discoveryCdp.close()
    if (!visualProducts?.sony?.href) throw new Error('Sony A7S III visual route not found')

    // Phase 2b: fresh target for screenshots. Install persisted visual state
    // before the very first storefront document loads, so cart/date stores
    // read the fixture values during module initialization.
    const actualTargetResponse = await fetch(debugBase + '/json/new?about:blank', { method: 'PUT' })
    const actualTarget = await actualTargetResponse.json()
    actualCdp = new CdpSession(actualTarget.webSocketDebuggerUrl)
    await actualCdp.open()
    await actualCdp.send('Page.enable')
    await actualCdp.send('Runtime.enable')
    await actualCdp.send('Log.enable')
    await actualCdp.send('Network.enable')
    await seedVisualBrowserStorage(actualCdp, visualProducts)

    const actualErrors = []
    actualCdp.on('Runtime.exceptionThrown', (params) => {
      actualErrors.push('EXCEPTION ' + (params.exceptionDetails?.exception?.description || params.exceptionDetails?.text || ''))
    })
    actualCdp.on('Log.entryAdded', (params) => {
      if (params.entry?.level === 'error') actualErrors.push('LOG ' + params.entry.text)
    })

    const report = {
      generatedAt: new Date().toISOString(),
      reference: 'design_handoff_swiss_bento/reference/Playback Rental.dc.html',
      actualBase,
      metrics: [],
      prototypeDrift: [],
      referenceErrors,
      actualErrors,
    }

    const productPath = visualProducts.sony.href

    await verifyActualMotion(actualCdp, productPath)
    await verifyStateDrivenMotion(actualCdp)
    await seedVisualBrowserStorage(actualCdp, visualProducts)
    await verifyBackForwardMotion(actualCdp)
    await seedVisualBrowserStorage(actualCdp, visualProducts)

    for (const viewport of viewports) {
      for (const screen of screens) {
        const stem = screen.id + '-' + viewport.id
        const referenceFile = referenceFiles.get(stem)
        const baselineFile = path.join(baselineDir, stem + '-reference.png')
        const actualFile = path.join(outputDir, stem + '-actual.png')
        const diffFile = path.join(outputDir, stem + '-diff.png')
        const driftFile = path.join(outputDir, stem + '-prototype-drift.png')

        await openActual(actualCdp, screen, viewport, productPath)
        if (screen.id === 'home' && viewport.id === 'mobile') {
          const geometry = await evaluate(
            actualCdp,
            "(()=>{const grid=document.querySelector('.pb-home-grid');const copy=document.querySelector('.pb-hero-copy');const side=document.querySelector('.pb-hero-side');return {innerWidth:window.innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,grid:grid?getComputedStyle(grid).gridTemplateColumns:null,copyColumn:copy?getComputedStyle(copy).gridColumn:null,copyWidth:copy?.getBoundingClientRect().width,sideColumn:side?getComputedStyle(side).gridColumn:null,sideWidth:side?.getBoundingClientRect().width,media760:matchMedia('(max-width:760px)').matches,media1020:matchMedia('(max-width:1020px)').matches}})()",
          )
          console.log('GEOMETRY home/mobile ' + JSON.stringify(geometry))
        }
        await capture(actualCdp, actualFile)

        const metrics = await compare(baselineFile, actualFile, diffFile)
        const drift = await compare(baselineFile, referenceFile, driftFile)
        report.metrics.push({ screen: screen.id, viewport: viewport.id, ...metrics })
        report.prototypeDrift.push({ screen: screen.id, viewport: viewport.id, ...drift })
        console.log(
          'VISUAL ' +
            screen.id +
            '/' +
            viewport.id +
            ' meaningful=' +
            metrics.meaningfulMismatchPercent +
            '% exact=' +
            metrics.exactMismatchPercent +
            '% meanDelta=' +
            metrics.meanChannelDelta,
        )
      }
    }

    writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
    const rows = report.metrics.map(
      (metric) =>
        '| ' +
        metric.screen +
        ' | ' +
        metric.viewport +
        ' | ' +
        metric.exactMismatchPercent +
        '% | ' +
        metric.meaningfulMismatchPercent +
        '% | ' +
        metric.meanChannelDelta +
        ' |',
    )
    writeFileSync(
      path.join(outputDir, 'report.md'),
      [
        '# Visual regression report',
        '',
        'Reference: ' + report.reference,
        '',
        '| Screen | Viewport | Exact mismatch | Meaningful mismatch (>16 RGB) | Mean channel delta |',
        '|---|---:|---:|---:|---:|',
        ...rows,
        '',
        '## Prototype baseline drift',
        '',
        '| Screen | Viewport | Exact drift | Meaningful drift (>16 RGB) | Mean channel delta |',
        '|---|---:|---:|---:|---:|',
        ...report.prototypeDrift.map(
          (metric) =>
            '| ' +
            metric.screen +
            ' | ' +
            metric.viewport +
            ' | ' +
            metric.exactMismatchPercent +
            '% | ' +
            metric.meaningfulMismatchPercent +
            '% | ' +
            metric.meanChannelDelta +
            ' |',
        ),
        '',
      ].join('\n'),
    )
  } catch (error) {
    if (referenceCdp) {
      try {
        const state = await evaluate(
          referenceCdp,
          "({ready:document.readyState,hasRoot:Boolean(document.querySelector('#dc-root')),hasReact:Boolean(window.React),hasReactDOM:Boolean(window.ReactDOM),hasBabel:Boolean(window.Babel),bodyText:document.body?.innerText?.slice(0,500)||'',scripts:Array.from(document.scripts).map(s=>s.src||'[inline]')})",
        )
        console.error('REFERENCE_STATE', JSON.stringify(state))
      } catch {}
    }
    console.error(error)
    if (chromeStderr) console.error(chromeStderr.slice(-5000))
    throw error
  } finally {
    referenceCdp?.close()
    actualCdp?.close()
    chrome.kill('SIGTERM')
    await sleep(300)
    reference.http.close()
    try {
      rmSync(userDataDir, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 })
    } catch (error) {
      console.warn('Chrome profile cleanup failed:', error.code || error.message)
    }
  }
}

main().catch(() => process.exit(1))
