import { spawn } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
const adminEmail = process.env.SMOKE_ADMIN_EMAIL
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD
const debugBase = 'http://127.0.0.1:9223'

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
      }, 20_000)
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

  once(method, timeoutMs = 20_000) {
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
  const userDataDir = path.join(os.tmpdir(), `playback-admin-smoke-chrome-${process.pid}`)
  const chromeProcess = spawn(
    chrome,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-background-networking',
      '--remote-debugging-port=9223',
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

    async function navigate(pathname, { width = 375, height = 812, mobile = true } = {}) {
      runtimeErrors = []
      await session.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      })
      const loaded = session.once('Page.loadEventFired')
      await session.send('Page.navigate', { url: new URL(pathname, baseUrl).toString() })
      await loaded
      await sleep(550)

      if (runtimeErrors.length) {
        throw new Error(`${pathname}: browser errors:\n${runtimeErrors.join('\n')}`)
      }

      return evaluate(
        session,
        `({
          pathname: location.pathname,
          search: location.search,
          body: document.body?.innerText || '',
          scrollWidth: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
          clientWidth: document.documentElement.clientWidth
        })`,
      )
    }

    let page = await navigate('/admin/login', { width: 1440, height: 900, mobile: false })
    if (page.pathname !== '/admin/login') {
      throw new Error(`Expected /admin/login before authentication, got ${page.pathname}`)
    }

    const login = await evaluate(
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
    if (login.status !== 200) {
      throw new Error(`Admin smoke login failed: HTTP ${login.status} ${login.body.slice(0, 500)}`)
    }
    console.log('PASS admin screen smoke login')

    const routes = [
      ['/admin/orders', 'Очередь заявок'],
      ['/admin/calendar', 'Календарь'],
      ['/admin/stock', 'Склад'],
      ['/admin/categories', 'Категории'],
      ['/admin/promotions', 'Акции'],
      ['/admin/promo-codes', 'Промокоды'],
      ['/admin/clients', 'Клиенты'],
      ['/admin/analytics', 'Аналитика'],
      ['/admin/media', 'Медиатека'],
      ['/admin/users', 'Пользователи'],
      ['/admin/settings', 'Настройки'],
    ]

    for (const [pathname, marker] of routes) {
      page = await navigate(pathname)
      if (page.pathname !== pathname) {
        throw new Error(`${pathname}: expected authenticated route, ended at ${page.pathname}${page.search}`)
      }
      if (!page.body.includes(marker)) {
        throw new Error(`${pathname}: expected visible marker ${JSON.stringify(marker)}; body=${page.body.slice(0, 1200)}`)
      }
      if (page.scrollWidth > page.clientWidth + 1) {
        throw new Error(`${pathname}: horizontal page overflow at 375px (${page.scrollWidth}px > ${page.clientWidth}px)`)
      }
      console.log(`PASS mobile admin route ${pathname}: ${page.scrollWidth}px / ${page.clientWidth}px`)
    }

    page = await navigate('/admin/analytics?from=2026-09-20&to=2026-09-18')
    if (page.pathname !== '/admin/analytics' || !page.body.includes('18.09.2026 — 20.09.2026')) {
      throw new Error(`Analytics reversed-range normalization is not visible: ${page.pathname}${page.search}\n${page.body.slice(0, 1600)}`)
    }
    console.log('PASS analytics visibly normalizes a reversed date range')

    page = await navigate('/admin/stock')
    const productHref = await evaluate(
      session,
      `Array.from(document.querySelectorAll('a[href^="/admin/products/"]')).find((a) => a.textContent?.includes('Smoke Camera Alpha'))?.getAttribute('href') || ''`,
    )
    if (!productHref) throw new Error('/admin/stock has no edit link for Smoke Camera Alpha')
    page = await navigate(productHref)
    if (page.pathname !== productHref || !page.body.includes('Smoke Camera Alpha')) {
      throw new Error(`${productHref}: product admin detail did not render the seeded product`)
    }
    if (page.scrollWidth > page.clientWidth + 1) {
      throw new Error(`${productHref}: horizontal page overflow at 375px (${page.scrollWidth}px > ${page.clientWidth}px)`)
    }
    console.log(`PASS product admin detail ${productHref}`)

    page = await navigate('/admin/orders/1')
    if (page.pathname !== '/admin/orders/1' || page.body.length < 40) {
      throw new Error(`/admin/orders/1: order detail did not render; ended at ${page.pathname}`)
    }
    if (page.scrollWidth > page.clientWidth + 1) {
      throw new Error(`/admin/orders/1: horizontal page overflow at 375px (${page.scrollWidth}px > ${page.clientWidth}px)`)
    }
    console.log('PASS cancelled smoke order remains readable in admin detail')

    const logout = await evaluate(
      session,
      `(async () => {
        const response = await fetch('/api/users/logout', { method: 'POST', credentials: 'include' })
        return { status: response.status, body: await response.text() }
      })()`,
    )
    if (logout.status < 200 || logout.status >= 300) {
      throw new Error(`Admin logout failed: HTTP ${logout.status} ${logout.body.slice(0, 500)}`)
    }

    page = await navigate('/admin/orders', { width: 1440, height: 900, mobile: false })
    if (page.pathname !== '/admin/login') {
      throw new Error(`Logout did not clear admin session: /admin/orders ended at ${page.pathname}`)
    }
    console.log('PASS logout clears session and guarded admin redirects to login')

    console.log('Admin screen smoke passed')
  } catch (error) {
    console.error('Admin screen smoke failed')
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
