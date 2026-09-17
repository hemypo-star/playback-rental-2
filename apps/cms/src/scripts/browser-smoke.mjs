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

    async function assertNoRuntimeErrors(context) {
      if (runtimeErrors.length) {
        throw new Error(`${context}: browser errors:\n${runtimeErrors.join('\n')}`)
      }
    }

    async function waitForExpression(expression, description, timeoutMs = 20_000) {
      const deadline = Date.now() + timeoutMs
      let lastError
      while (Date.now() < deadline) {
        try {
          if (await evaluate(session, expression)) {
            await assertNoRuntimeErrors(description)
            return
          }
        } catch (error) {
          lastError = error
        }
        await sleep(250)
      }
      const body = await evaluate(session, 'document.body?.innerText || ""').catch(() => '')
      throw new Error(`${description}: timed out${lastError ? `; ${lastError.message}` : ''}\n${body.slice(0, 2000)}`)
    }

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

      await assertNoRuntimeErrors(pathname)
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
    const productHref = await evaluate(
      session,
      `Array.from(document.querySelectorAll('a[href^="/product/"]')).find((a) => a.textContent?.includes('Smoke Camera Alpha'))?.getAttribute('href') || ''`,
    )
    if (!productHref) throw new Error('/catalog has no Smoke Camera Alpha product link')
    const productId = Number(productHref.split('/').pop())
    if (!Number.isInteger(productId) || productId <= 0) throw new Error(`Invalid seeded product route: ${productHref}`)
    console.log(`PASS seeded catalog; camera route ${productHref}`)

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
    if (!body.includes('Smoke Camera Alpha')) throw new Error(`${productHref}: seeded camera title is missing`)
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

    // Exercise the public checkout as a browser would, but seed its cart and
    // shared date range directly into the two stores' documented storage
    // keys. A full Page.navigate follows so the client stores read those
    // values on module initialization; this is not mutating React internals.
    const checkoutDate = await evaluate(
      session,
      `(() => {
        const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        date.setUTCHours(10, 0, 0, 0)
        const iso = date.toISOString()
        localStorage.setItem('pb:cart', JSON.stringify([{
          productId: ${productId},
          title: 'Smoke Camera Alpha',
          price: 1500,
          listingType: 'rental',
          unit: 'шт.',
          quantity: 1
        }]))
        sessionStorage.setItem('pb:selectedDates', JSON.stringify({ startDate: iso, endDate: iso }))
        return iso
      })()`,
    )

    body = await navigate('/checkout')
    if (!body.includes('Smoke Camera Alpha') || !body.includes('Заявка на аренду')) {
      throw new Error('/checkout did not hydrate the seeded cart')
    }
    await waitForExpression(
      `document.body.innerText.includes('свободно на ваши даты')`,
      'checkout availability check',
    )
    console.log(`PASS checkout cart/date hydration and availability (${checkoutDate})`)

    const filled = await evaluate(
      session,
      `(() => {
        const setValue = (selector, value) => {
          const element = document.querySelector(selector)
          if (!element) throw new Error('Missing field: ' + selector)
          const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')
          descriptor.set.call(element, value)
          element.dispatchEvent(new Event('input', { bubbles: true }))
        }
        setValue('input[placeholder="Как к вам обращаться"]', 'Смоук Тест')
        setValue('input[placeholder="+7 (___) ___-__-__"]', '+7 (900) 111-22-33')
        setValue('input[placeholder="email@example.com"]', 'smoke-customer@example.invalid')
        setValue('input[placeholder="Промокод"]', 'SMOKE10')
        document.querySelector('#agree-data')?.click()
        document.querySelector('#agree-terms')?.click()
        const promoInput = document.querySelector('input[placeholder="Промокод"]')
        const applyButton = promoInput?.parentElement?.querySelector('button')
        if (!applyButton) throw new Error('Promo apply button is missing')
        applyButton.click()
        return true
      })()`,
    )
    if (!filled) throw new Error('Checkout form setup failed')

    await waitForExpression(
      `Boolean(document.querySelector('input[placeholder="Промокод"]')?.disabled) && document.body.innerText.includes('Скидка')`,
      'checkout promo application',
    )
    console.log('PASS checkout promo UI applied SMOKE10')

    await evaluate(
      session,
      `(() => {
        const submit = document.querySelector('button[type="submit"][form="checkout-form"]')
        if (!submit) throw new Error('Checkout submit button is missing')
        submit.click()
        return true
      })()`,
    )
    await waitForExpression(
      `document.body.innerText.includes('Заявка отправлена!')`,
      'checkout submit success',
      30_000,
    )
    body = await evaluate(session, 'document.body.innerText')
    const orderMatch = body.match(/Заявка №(\d+)/)
    if (!orderMatch) throw new Error('Checkout success card has no order number')
    const orderId = Number(orderMatch[1])
    console.log(`PASS public checkout created order ${orderId}`)

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

    const persisted = await evaluate(
      session,
      `(async () => {
        const orderResponse = await fetch('/api/orders/${orderId}?depth=0', { credentials: 'include' })
        const itemResponse = await fetch('/api/orderItems?where[order][equals]=${orderId}&limit=10&depth=0', { credentials: 'include' })
        return {
          orderStatus: orderResponse.status,
          order: await orderResponse.json(),
          itemsStatus: itemResponse.status,
          items: await itemResponse.json(),
        }
      })()`,
    )
    if (persisted.orderStatus !== 200 || persisted.itemsStatus !== 200) {
      throw new Error(`Persisted order API failed: ${JSON.stringify(persisted)}`)
    }
    if (
      persisted.order?.status !== 'pending' ||
      persisted.order?.promoCode !== 'SMOKE10' ||
      persisted.order?.promoDiscount !== 150 ||
      persisted.order?.totalPrice !== 1350 ||
      !persisted.order?.submittedAt
    ) {
      throw new Error(`Persisted order has unexpected values: ${JSON.stringify(persisted.order)}`)
    }
    if (
      !Array.isArray(persisted.items?.docs) ||
      persisted.items.docs.length !== 1 ||
      persisted.items.docs[0]?.quantity !== 1 ||
      persisted.items.docs[0]?.lineTotal !== 1500
    ) {
      throw new Error(`Persisted order item has unexpected values: ${JSON.stringify(persisted.items)}`)
    }
    console.log('PASS persisted order/item totals and promo snapshot')

    body = await navigate('/admin')
    const adminPath = await evaluate(session, 'location.pathname')
    if (adminPath !== '/admin/orders' || !body.includes('Очередь заявок')) {
      throw new Error(`/admin auth flow ended at ${adminPath} without the orders dashboard`)
    }
    if (!body.includes('Смоук Тест')) throw new Error('/admin/orders does not show the checkout smoke customer')
    console.log('PASS authenticated /admin -> /admin/orders with created order visible')

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
