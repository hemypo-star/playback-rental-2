import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const appBase = process.env.VISUAL_APP_URL || 'http://127.0.0.1:3000'
const referenceBase = process.env.VISUAL_REFERENCE_URL || 'http://127.0.0.1:4173/design_handoff_swiss_bento/reference/Playback%20Rental%20-%20%D0%BF%D1%80%D0%BE%D0%BA%D0%B0%D1%82%20%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D0%BA%D0%B8.html'
const outDir = path.resolve(process.env.VISUAL_OUT_DIR || 'visual-artifacts')
const adminEmail = process.env.SMOKE_ADMIN_EMAIL || 'smoke-admin@example.invalid'
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || 'ci-smoke-only-password-2026'
const debugBase = 'http://127.0.0.1:9222'

const viewports = [
  { name: '1440', width: 1440, height: 900, mobile: false },
  { name: '1020', width: 1020, height: 900, mobile: false },
  { name: '760', width: 760, height: 900, mobile: true },
  { name: '375', width: 375, height: 812, mobile: true },
]

const screenLabels = {
  home: 'Главная',
  catalog: 'Каталог',
  product: 'Товар',
  checkout: 'Корзина',
  admin: 'Админка',
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
      }, 30_000)
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

  once(method, timeoutMs = 30_000) {
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

async function waitForExpression(session, expression, description, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      if (await evaluate(session, expression)) return
    } catch (error) {
      lastError = error
    }
    await sleep(250)
  }
  throw new Error(`${description}: timed out${lastError ? `; ${lastError.message}` : ''}`)
}

async function setViewport(session, viewport) {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  })
  await session.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
}

async function navigate(session, url) {
  const loaded = session.once('Page.loadEventFired')
  await session.send('Page.navigate', { url })
  await loaded
  await sleep(500)
}

async function screenshotFullPage(session, filePath) {
  await evaluate(session, `(() => {
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    return true
  })()`)
  await sleep(100)

  const metrics = await session.send('Page.getLayoutMetrics')
  const width = Math.ceil(metrics.cssContentSize?.width || metrics.contentSize?.width || 1)
  const height = Math.ceil(metrics.cssContentSize?.height || metrics.contentSize?.height || 1)
  const shot = await session.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })
  writeFileSync(filePath, Buffer.from(shot.data, 'base64'))
  return { width, height }
}

async function captureReference(session, viewport, screen, metrics) {
  await setViewport(session, viewport)
  await navigate(session, referenceBase)

  await waitForExpression(
    session,
    `Boolean(document.querySelector('main[data-screen-label="Главная"]'))`,
    'reference bundle render',
  )

  await evaluate(session, `(() => {
    document.querySelector('#__bundler_thumbnail')?.remove()
    document.querySelector('#__bundler_loading')?.remove()
    return true
  })()`)

  const label = screenLabels[screen]
  if (screen !== 'home') {
    const clicked = await evaluate(
      session,
      `(() => {
        const fixed = Array.from(document.querySelectorAll('div')).find((el) => {
          const style = getComputedStyle(el)
          const text = el.innerText || ''
          return style.position === 'fixed' && text.includes('Главная') && text.includes('Каталог') && text.includes('Админка')
        })
        if (!fixed) return false
        const target = Array.from(fixed.querySelectorAll('div')).find((el) => (el.innerText || '').trim() === ${JSON.stringify(label)})
        if (!target) return false
        target.click()
        return true
      })()`,
    )
    if (!clicked) throw new Error(`Reference screen switch failed: ${label}`)
    await waitForExpression(
      session,
      `Boolean(document.querySelector('main[data-screen-label=${JSON.stringify(label)}]'))`,
      `reference ${label}`,
    )
    await sleep(150)
  }

  await evaluate(session, `(() => {
    const fixed = Array.from(document.querySelectorAll('div')).find((el) => {
      const style = getComputedStyle(el)
      const text = el.innerText || ''
      return style.position === 'fixed' && text.includes('Главная') && text.includes('Каталог') && text.includes('Админка')
    })
    if (fixed) fixed.style.visibility = 'hidden'
    return true
  })()`)

  const dir = path.join(outDir, 'reference')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${screen}-${viewport.name}.png`)
  const size = await screenshotFullPage(session, file)
  metrics.reference[`${screen}-${viewport.name}`] = size
  console.log(`CAPTURE reference ${screen} ${viewport.name}: ${size.width}x${size.height}`)
}

async function setupCurrentOrigin(session) {
  await navigate(session, appBase)

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
  if (loginResult.status !== 200) {
    throw new Error(`Admin login failed: HTTP ${loginResult.status} ${String(loginResult.body).slice(0, 300)}`)
  }

  const productHref = await evaluate(
    session,
    `Array.from(document.querySelectorAll('a[href^="/product/"]')).find((a) => a.textContent?.includes('Smoke Camera Alpha'))?.getAttribute('href') || ''`,
  )
  if (!productHref) {
    await navigate(session, new URL('/catalog', appBase).toString())
  }
  const resolvedHref =
    productHref ||
    (await evaluate(
      session,
      `Array.from(document.querySelectorAll('a[href^="/product/"]')).find((a) => a.textContent?.includes('Smoke Camera Alpha'))?.getAttribute('href') || ''`,
    ))
  if (!resolvedHref) throw new Error('Seeded Smoke Camera Alpha product link not found')
  return resolvedHref
}

async function seedCheckoutStorage(session, productHref) {
  const productId = Number(productHref.split('/').pop())
  if (!Number.isInteger(productId) || productId <= 0) throw new Error(`Invalid product href: ${productHref}`)
  await evaluate(
    session,
    `(() => {
      const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      date.setUTCHours(10, 0, 0, 0)
      const end = new Date(date)
      end.setUTCDate(end.getUTCDate() + 2)
      localStorage.setItem('pb:cart', JSON.stringify([{
        productId: ${productId},
        title: 'Smoke Camera Alpha',
        price: 1500,
        listingType: 'rental',
        unit: 'шт.',
        quantity: 1
      }]))
      sessionStorage.setItem('pb:selectedDates', JSON.stringify({
        startDate: date.toISOString(),
        endDate: end.toISOString()
      }))
      return true
    })()`,
  )
}

async function captureCurrent(session, viewport, screen, productHref, metrics) {
  await setViewport(session, viewport)

  if (screen === 'home') {
    await navigate(session, appBase)
  } else if (screen === 'catalog') {
    await navigate(session, new URL('/catalog', appBase).toString())
  } else if (screen === 'product') {
    await navigate(session, new URL(productHref, appBase).toString())
  } else if (screen === 'checkout') {
    await navigate(session, appBase)
    await seedCheckoutStorage(session, productHref)
    await navigate(session, new URL('/checkout', appBase).toString())
    await waitForExpression(
      session,
      `document.body.innerText.includes('Smoke Camera Alpha')`,
      'current checkout cart hydration',
    )
    await sleep(500)
  } else if (screen === 'admin') {
    await navigate(session, new URL('/admin/orders', appBase).toString())
    await waitForExpression(
      session,
      `location.pathname === '/admin/orders' && document.body.innerText.includes('Очередь заявок')`,
      'current admin orders',
    )
  }

  await evaluate(session, `(() => {
    document.querySelectorAll('[style*="animation"]').forEach((el) => {
      el.style.animationDelay = '0ms'
    })
    return true
  })()`)
  await sleep(150)

  const dir = path.join(outDir, 'current')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${screen}-${viewport.name}.png`)
  const size = await screenshotFullPage(session, file)
  metrics.current[`${screen}-${viewport.name}`] = size
  console.log(`CAPTURE current ${screen} ${viewport.name}: ${size.width}x${size.height}`)
}

async function main() {
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  const chrome = findChrome()
  const userDataDir = path.join(os.tmpdir(), `playback-visual-chrome-${process.pid}`)
  const chromeProcess = spawn(
    chrome,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-networking',
      '--hide-scrollbars',
      '--font-render-hinting=none',
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

    const metrics = { reference: {}, current: {} }

    for (const viewport of viewports) {
      for (const screen of Object.keys(screenLabels)) {
        await captureReference(session, viewport, screen, metrics)
      }
    }

    await setViewport(session, viewports[0])
    const productHref = await setupCurrentOrigin(session)

    for (const viewport of viewports) {
      for (const screen of Object.keys(screenLabels)) {
        await captureCurrent(session, viewport, screen, productHref, metrics)
      }
    }

    writeFileSync(path.join(outDir, 'metrics.json'), JSON.stringify(metrics, null, 2))
    writeFileSync(
      path.join(outDir, 'README.txt'),
      [
        'Playback Rental visual capture',
        'reference = design_handoff_swiss_bento/reference bundled prototype',
        'current = apps/cms on the tested commit',
        'screens = home, catalog, product, checkout, admin',
        'viewports = 1440x900, 1020x900, 760x900, 375x812',
        'prefers-reduced-motion = reduce',
      ].join('\n') + '\n',
    )
    console.log('Visual capture complete')
  } catch (error) {
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
