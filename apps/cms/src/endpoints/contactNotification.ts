import type { Endpoint } from 'payload'
import { CONTACT_MAX_BODY_BYTES, parseContactInput } from '../lib/notifications/contactInput'
import { sendContactNotification } from '../lib/notifications/webhook'
import { checkRateLimits, type RateLimitCheck } from '../lib/security/rateLimit'
import { getClientIp } from '../lib/security/clientIp'

// Public endpoint for the storefront's /contact form — no collection backs
// this. A valid submission is appended to the same durable local notification
// queue used by checkout; the VDS worker delivers it to configured admin
// Telegram/MAX/VK/SMTP destinations.
export const contactNotificationEndpoint: Endpoint = {
  path: '/contact-notification',
  method: 'post',
  handler: async (req) => {
    // SEC-026: refuse oversized bodies before reading them, then validate
    // types and lengths so nothing unbounded reaches the notification queue.
    if (Number(req.headers.get('content-length') || 0) > CONTACT_MAX_BODY_BYTES) {
      return Response.json({ error: 'request body is too large' }, { status: 413 })
    }
    const parsed = parseContactInput(await Promise.resolve(req.json?.()).catch(() => undefined))
    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 })
    }
    const body = parsed.value

    // A2 (design_handoff_swiss_bento/08-instruction.md, audit G1) — by IP
    // (when trustworthy) and by email, checked and recorded together in one
    // checkRateLimits() call immediately before accepting the notification.
    // This prevents a request rejected on one dimension from spending a slot
    // in another dimension for work that was never accepted.
    const ip = getClientIp(req.headers)
    const rateLimitChecks: RateLimitCheck[] = [
      { bucket: 'contact_email', key: body.email.toLowerCase() },
      { bucket: 'contact_global', key: 'all' },
    ]
    if (ip) rateLimitChecks.push({ bucket: 'contact_ip', key: ip })
    const allowed = await checkRateLimits(req.payload, rateLimitChecks)
    if (!allowed) {
      return Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429 })
    }

    const result = await sendContactNotification({
      name: body.name,
      email: body.email,
      phone: body.phone,
      subject: body.subject,
      message: body.message,
    })

    return Response.json({ success: result.success })
  },
}
