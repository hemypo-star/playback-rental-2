import type { Endpoint } from 'payload'
import { parseEntityHref, syncSingleEntity } from '../lib/moysklad/sync'

// МойСклад webhook payload shape: { events: [{ meta: { href, type }, action, accountId }] }
// https://dev.moysklad.ru/doc/api/remap/1.2/#... (webhooks)
export const moyskladWebhookEndpoint: Endpoint = {
  path: '/webhooks/moysklad',
  method: 'post',
  handler: async (req) => {
    // МойСклад doesn't sign webhook payloads (no HMAC to verify), so this
    // endpoint would otherwise be open to anyone on the internet triggering
    // arbitrary resyncs. Register the webhook URL with this secret as a
    // query param (?secret=...); reject anything else.
    const expectedSecret = process.env.MOYSKLAD_WEBHOOK_SECRET
    const providedSecret = new URL(req.url || '', 'http://localhost').searchParams.get('secret')
    if (!expectedSecret || providedSecret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = req.json ? await req.json() : {}
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const events: any[] = Array.isArray(body?.events) ? body.events : []
    if (events.length === 0) {
      return Response.json({ received: 0, results: [] })
    }

    const results = await Promise.all(
      events.map(async (event) => {
        const href = event?.meta?.href
        if (!href) return { href: null, synced: false, reason: 'No href in event' }

        const parsed = parseEntityHref(href)
        if (!parsed) return { href, synced: false, reason: 'Could not parse entity type/id from href' }

        if (event.action === 'DELETE') {
          // Out of scope for Phase 1: a deleted МойСклад item should
          // probably mark the local product unavailable rather than
          // deleting it outright (an order might still reference it).
          // Flagged here rather than silently ignored.
          return { href, synced: false, reason: 'DELETE events not yet handled — flagged for follow-up' }
        }

        try {
          const result = await syncSingleEntity(req.payload, parsed.type, parsed.id)
          return { href, ...result }
        } catch (error) {
          req.payload.logger.error({ err: error, href }, 'МойСклад webhook: failed to sync entity')
          return {
            href,
            synced: false,
            reason: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      }),
    )

    return Response.json({ received: events.length, results })
  },
}
