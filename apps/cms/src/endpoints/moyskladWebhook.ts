import type { Endpoint } from 'payload'
import { parseEntityHref, syncSingleEntity, handleEntityDeleted } from '../lib/moysklad/sync'
import { secretsMatch } from '../lib/security/timingSafe'

// МойСклад webhook payload shape: { events: [{ meta: { href, type }, action, accountId }] }
// https://dev.moysklad.ru/doc/api/remap/1.2/#... (webhooks)
// Untrusted external input — fields are optional/unknown-shaped on purpose,
// every access below is guarded rather than assumed present.
interface MsWebhookEvent {
  meta?: { href?: string }
  action?: string
}

interface MsWebhookBody {
  events?: MsWebhookEvent[]
}
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
    if (!expectedSecret || !secretsMatch(providedSecret, expectedSecret)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: MsWebhookBody
    try {
      body = req.json ? await req.json() : {}
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const events: MsWebhookEvent[] = Array.isArray(body?.events) ? body.events : []
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
          // SEC-006 (docs/audits/2026-08-24-baseline.md) — previously
          // ignored outright ("flagged for follow-up"), leaving a deleted
          // МойСклад item bookable indefinitely. handleEntityDeleted marks
          // the corresponding local product unavailable rather than
          // deleting it (an order might still reference it).
          try {
            const result = await handleEntityDeleted(req.payload, parsed.type, parsed.id)
            return { href, synced: result.handled, reason: result.reason }
          } catch (error) {
            req.payload.logger.error({ err: error, href }, 'МойСклад webhook: failed to handle DELETE event')
            return {
              href,
              synced: false,
              failed: true,
              reason: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        }

        try {
          const result = await syncSingleEntity(req.payload, parsed.type, parsed.id)
          return { href, ...result }
        } catch (error) {
          req.payload.logger.error({ err: error, href }, 'МойСклад webhook: failed to sync entity')
          return {
            href,
            synced: false,
            // Distinct from the structural "not applicable" reasons above
            // (no href, unparseable) — this one is a genuine, possibly-
            // transient failure, and the only kind worth telling МойСклад
            // to retry over.
            failed: true,
            reason: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      }),
    )

    // Previously always 200, even when every event above threw — a
    // transport-level "success" response meant МойСклад had no reason to
    // ever redeliver a failed event (DB hiccup, rate limit, a unique-
    // constraint race from a concurrent duplicate delivery). Surface real
    // failures as a non-2xx so its webhook delivery actually retries.
    const hasFailure = results.some((r) => r.failed)
    return Response.json({ received: events.length, results }, { status: hasFailure ? 502 : 200 })
  },
}
