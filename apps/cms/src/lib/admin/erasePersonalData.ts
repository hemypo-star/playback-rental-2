import type { Payload } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'
import { normalizePhoneForRateLimit } from '../text/phone'
import { storedRateLimitKey } from '../security/rateLimit'

// Withdrawal of consent (152-FZ art. 21): personal data is kept until the
// customer withdraws consent (owner's decision, 2026-10-21), and then has to
// go. Orders themselves stay — they are the shop's accounting record and
// stock history — but every contact field is blanked and the erasure is
// stamped on the order (who and when), the operator's proof it was done.
// Rate-limit rows keyed on the same e-mail/phone are deleted too.
//
// Not covered, and said so in the admin UI: the counterparty МойСклад created
// for the order, and notification jobs (the queue drops them after
// NOTIFICATION_RETENTION_DAYS).

export const ERASED_CUSTOMER_NAME = 'Данные удалены'

/** Matches by e-mail (case-insensitive) or by phone digits (+7/8 folded). */
export async function erasePersonalData(payload: Payload, query: string, actorEmail: string): Promise<{ orders: number }> {
  const needle = query.trim()
  if (!needle) return { orders: 0 }
  const byEmail = needle.includes('@')
  const wanted = byEmail ? needle.toLowerCase() : normalizePhoneForRateLimit(needle)
  if (!byEmail && wanted.length < 10) return { orders: 0 }

  // Orders are few (a rental shop), and phones are stored as typed, so match
  // in code rather than in SQL.
  const { docs } = await payload.find({
    collection: 'orders',
    where: { personalDataErasedAt: { exists: false } },
    limit: 0,
    depth: 0,
    overrideAccess: true,
  })
  const matches = docs.filter((o) =>
    byEmail ? o.customerEmail.toLowerCase() === wanted : normalizePhoneForRateLimit(o.customerPhone) === wanted,
  )

  const rateKeys = new Set<string>()
  const erasedAt = new Date().toISOString()
  for (const order of matches) {
    rateKeys.add(storedRateLimitKey(order.customerEmail.toLowerCase()))
    rateKeys.add(storedRateLimitKey(normalizePhoneForRateLimit(order.customerPhone)))
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: {
        customerName: ERASED_CUSTOMER_NAME,
        // Required e-mail field: a reserved per-order address keeps it valid
        // without pointing at anyone.
        customerEmail: `erased-${order.id}@erased.invalid`,
        customerPhone: '—',
        notes: '',
        personalDataErasedAt: erasedAt,
        personalDataErasedBy: actorEmail,
      },
      overrideAccess: true,
    })
  }

  const db = (payload.db as unknown as PostgresAdapter).drizzle
  for (const key of rateKeys) await db.execute(sql`DELETE FROM "rate_limit_hits" WHERE "rate_key" = ${key}`)

  payload.logger.info({ orders: matches.length, by: actorEmail }, 'Personal data erased on customer request')
  return { orders: matches.length }
}
