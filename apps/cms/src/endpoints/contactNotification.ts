import type { Endpoint } from 'payload'
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
    const body = (await req.json?.()) as
      | { name?: string; email?: string; phone?: string; subject?: string; message?: string }
      | undefined

    if (!body?.name || !body?.email || !body?.phone || !body?.message) {
      return Response.json({ error: 'name, email, phone and message are required' }, { status: 400 })
    }

    // A2 (design_handoff_swiss_bento/08-instruction.md, audit G1) — by IP
    // (when trustworthy) and by email, checked and recorded together in one
    // checkRateLimits() call immediately before accepting the notification.
    // This prevents a request rejected on one dimension from spending a slot
    // in another dimension for work that was never accepted.
    const ip = getClientIp(req.headers)
    const rateLimitChecks: RateLimitCheck[] = [{ bucket: 'contact_email', key: body.email.toLowerCase().trim() }]
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
