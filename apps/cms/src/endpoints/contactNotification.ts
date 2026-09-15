import type { Endpoint } from 'payload'
import { sendContactNotification } from '../lib/notifications/webhook'
import { checkRateLimits, type RateLimitCheck } from '../lib/security/rateLimit'
import { getClientIp } from '../lib/security/clientIp'

// Public endpoint for the storefront's /contact form — no collection backs
// this (nothing to store or moderate), it's a direct pass-through to the
// same notification webhook order confirmations go to.
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
    // (when trustworthy) and by email, checked and recorded together in
    // one checkRateLimits() call right before actually sending the
    // notification, not as two separate checkRateLimit() calls. Review
    // fix, same reasoning as checkout/actions.ts and collections/Users.ts:
    // two independent checks would each record their own hit as soon as
    // THEY passed, so a submission rejected on (say) email alone would
    // still have already spent a slot of the IP bucket for a notification
    // that never actually sent.
    //
    // This also means the body is now parsed and validated *before* the
    // rate-limit check runs, unlike this endpoint's first version (which
    // checked IP before reading the body at all, specifically to reject an
    // over-limit request without doing any work). That early-exit was a
    // minor optimization, not a correctness requirement — parsing a small
    // JSON body is cheap, nothing downstream of the 400 above ever touches
    // the notification webhook, and folding the IP check into the same
    // atomic call as the email check (which can only be known after
    // parsing the body) is what closes the slot-stealing bug above.
    // Trading a small, harmless amount of extra work on a malformed
    // request for that correctness fix is the right side of that trade.
    //
    // getClientIp() returns null rather than a fallback 'unknown' string
    // when the IP truly can't be trusted (TRUST_PROXY_HEADERS off; see
    // clientIp.ts and this repo's own compose.yaml, which puts nothing in
    // front of `cms`) — the IP dimension is skipped entirely in that case,
    // same as checkout/actions.ts, and the email dimension (always
    // present on this form) survives on its own.
    const ip = getClientIp(req.headers)
    const rateLimitChecks: RateLimitCheck[] = [{ bucket: 'contact_email', key: body.email.toLowerCase().trim() }]
    if (ip) rateLimitChecks.push({ bucket: 'contact_ip', key: ip })
    const allowed = await checkRateLimits(req.payload, rateLimitChecks)
    if (!allowed) {
      // { success: false, code: 'RATE_LIMITED' } — ContactForm.tsx reads
      // `code` to show the same Russian text lib/checkoutErrors.ts already
      // has for this situation (reused, not re-derived), rather than its
      // generic "не удалось отправить" fallback.
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
