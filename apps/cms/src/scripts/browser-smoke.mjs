import { spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
const adminEmail = process.env.SMOKE_ADMIN_EMAIL
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD
const debugBase = 'http://127.0.0.1:9222'

if (!adminEmail || !adminPassword) {
  console.error('SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required')
  process.exit(1)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean)
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error(`Headless Chrome not found. Checked: ${candidates.join(', ')}`)
  return found
}

async function waitForJson(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
      lastError = new Error(`${url} returned ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await sleep(250)
  }
  throw lastError || new Error(`Timed out waiting for ${url}`)
}

class CdpSession {
  constructor(webSocketUrl) {
    this.webSocketUrl = webSocketUrl
    this.nextId = 1
    this.pending = new Map()
    this.listeners = new Map()
  }

  async connect() {
    this.ws = new WebSocket(this.webSocketUrl)
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out connecting to Chrome DevTools')), 10_000)
      this.ws.addEventListener('open', () => {
        clearTimeout(timer)
        resolve()
      })
      this.ws.addEventListener('error', (event) => {
        clearTimeout(timer)
        reject(event.error || new Error('Chrome DevTools WebSocket error'))
      })
    })

    this.ws.addEventListener('message', async (event) => {
      const raw = typeof event.data === 'string' ? event.data : await event.data.text()
      const message = JSON.parse(raw)
      if (message.id) {
        const pending = this.pending.get(message.id)
        if (!pending) return
        this.pending.delete(message.id)
        clearTimeout(pending.timer)
        if (message.error) pending.reject(new Error(`${pending.method}: ${message.error.message}`))
        else pending.resolve(message.result || {})
        return
      }

      const callbacks = this.listeners.get(message.method)
      if (!callbacks) return
      for (const callback of [...callbacks]) callback(message.params || {})
    })
  }

  send(method, params = {}) {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method}: timed out`))
      }, 15_000)
      this.pending.set(id, { resolve, reject, timer, method })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) || new Set()
    callbacks.add(callback)
    this.listeners.set(method, callbacks)
    return () => callbacks.delete(callback)
  }

  once(method, timeoutMs = 15_000) {
    return new Promise((resolve, reject) => {
      let off = () => {}
      const timer = setTimeout(() => {
        off()
        reject(new Error(`${method}: event timed out`))
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

async function createTarget() {
  const response = await fetch(`${debugBase}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })
  if (!response.ok) throw new Error(`Chrome target creation failed: ${response.status}`)
  return response.json()
}

async function evaluate(session, expression) {
  const result = await session.send('Runtime.evaluate', {
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

async function main() {
  const chrome = findChrome()
  const userDataDir = path.join(os.tmpdir(), `playback-smoke-chrome-${process.pid}`)
  const chromeProcess = spawn(
    chrome,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-networking',
      '--remote-debugging-port=9222',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )

  let chromeStderr = ''
  chromeProcess.stderr.on('data', (chunk) => {
    chromeStderr += String(chunk)
    if (chromeStderr.length > 20_000) chromeStderr = chromeStderr.slice(-20_000)
  })

  let session
  try {
    await waitForJson(`${debugBase}/json/version`)
    const target = await createTarget()
    session = new CdpSession(target.webSocketDebuggerUrl)
    await session.connect()
    await session.send('Page.enable')
    await session.send('Runtime.enable')

    let runtimeErrors = []
    session.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      runtimeErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text || 'Uncaught browser exception')
    })
    session.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (type !== 'error') return
      runtimeErrors.push(
        `console.error: ${args
          .map((arg) => arg.value ?? arg.description ?? '')
          .filter(Boolean)
          .join(' ')}`,
      )
    })

    async function navigate(pathname, { width = 1440, height = 900, mobile = false, reducedMotion = false } = {}) {
      runtimeErrors = []
      await session.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      })
      await session.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }],
      })
      const loaded = session.once('Page.loadEventFired')
      await session.send('Page.navigate', { url: new URL(pathname, baseUrl).toString() })
      await loaded
      await sleep(650)

      if (runtimeErrors.length) {
        throw new Error(`${pathname}: browser errors:\n${runtimeErrors.join('\n')}`)
      }

      const bodyText = await evaluate(session, 'document.body?.innerText || ""')
      if (!bodyText || bodyText.trim().length < 20) throw new Error(`${pathname}: page body is unexpectedly empty`)
      return bodyText
    }

    async function assertNoHorizontalOverflow(pathname, options = {}) {
      await navigate(pathname, { width: 375, height: 812, mobile: true, ...options })
      const metrics = await evaluate(
        session,
        `({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth, bodyWidth: document.body.scrollWidth })`,
      )
      const widest = Math.max(metrics.scrollWidth, metrics.bodyWidth)
      if (widest > metrics.clientWidth + 1) {
        throw new Error(`${pathname}: horizontal overflow at 375px (${widest}px > ${metrics.clientWidth}px)`)
      }
      console.log(`PASS mobile overflow ${pathname}: ${widest}px / ${metrics.clientWidth}px`)
    }

    let body = await navigate('/')
    console.log(`PASS browser / (${body.length} chars)`)

    await assertNoHorizontalOverflow('/')
    await assertNoHorizontalOverflow('/catalog')
    await assertNoHorizontalOverflow('/contact')

    body = await navigate('/', { width: 375, height: 812, mobile: true, reducedMotion: true })
    if (!body.includes('Playback')) throw new Error('Reduced-motion homepage did not render expected content')
    console.log('PASS prefers-reduced-motion homepage render')

    body = await navigate('/catalog')
    if (!body.includes('Smoke Camera Alpha') || !body.includes('Smoke Lens Beta')) {
      throw new Error('/catalog did not render both seeded smoke products')
    }
    const productHref = await evaluate(session, `document.querySelector('a[href^="/product/"]')?.getAttribute('href') || ''`)
    if (!productHref) throw new Error('/catalog has no product link')
    console.log(`PASS seeded catalog; product route ${productHref}`)

    body = await navigate('/catalog?q=SmokeDescriptionNeedle')
    if (!body.includes('Smoke Camera Alpha') || body.includes('Smoke Lens Beta')) {
      throw new Error('Catalog description search did not isolate the expected product')
    }
    console.log('PASS catalog search by description')

    body = await navigate('/catalog?q=SmokeTagNeedle')
    if (!body.includes('Smoke Camera Alpha') || body.includes('Smoke Lens Beta')) {
      throw new Error('Catalog tag search did not isolate the expected product')
    }
    console.log('PASS catalog search by tag')

    body = await navigate('/catalog/smoke-lenses')
    if (!body.includes('Smoke Lens Beta')) throw new Error('Nested category route did not render its seeded product')
    console.log('PASS nested category route')

    body = await navigate(productHref)
    if (!body.includes('Smoke Camera Alpha') && !body.includes('Smoke Lens Beta')) {
      throw new Error(`${productHref}: seeded product title is missing`)
    }
    console.log('PASS product detail route')

    const promoResult = await evaluate(
      session,
      `(async () => {
        const response = await fetch('/api/promo-codes/validate?code=smoke10')
        return { status: response.status, body: await response.json() }
      })()`,
    )
    if (promoResult.status !== 200 || !promoResult.body?.valid || promoResult.body.discountValue !== 10) {
      throw new Error(`Promo smoke validation failed: ${JSON.stringify(promoResult)}`)
    }
    console.log('PASS public promo validation')

    const loginResult = await evaluate(
      session,
      `(async () => {
        const response = await fetch('/api/users/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: ${JSON.stringify(adminEmail)}, password: ${JSON.stringify(adminPassword)} })
        })
        return { status: response.status, body: await response.text() }
      })()`,
    )
    if (loginResult.status !== 200) throw new Error(`Admin login failed: HTTP ${loginResult.status} ${loginResult.body.slice(0, 500)}`)
    console.log('PASS admin API login')

    body = await navigate('/admin')
    const adminPath = await evaluate(session, 'location.pathname')
    if (adminPath !== '/admin/orders' || !body.includes('Очередь заявок')) {
      throw new Error(`/admin auth flow ended at ${adminPath} without the orders dashboard`)
    }
    console.log('PASS authenticated /admin -> /admin/orders')

    await assertNoHorizontalOverflow('/admin/orders')

    console.log('Browser smoke passed')
  } catch (error) {
    console.error('Browser smoke failed')
    console.error(error)
    if (chromeStderr) console.error(`--- Chrome stderr ---\n${chromeStderr.slice(-5000)}`)
    process.exitCode = 1
  } finally {
    session?.close()
    chromeProcess.kill('SIGTERM')
    await sleep(250)
    if (!chromeProcess.killed) chromeProcess.kill('SIGKILL')
    rmSync(userDataDir, { recursive: true, force: true })
  }
}

main()
