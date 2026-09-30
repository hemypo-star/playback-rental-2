// Proves two review fixes for lib/security/rateLimit.ts:
//
// 1. The check-then-insert race ("most important"). Before this fix,
//    `checkRateLimit` ran a plain `SELECT count(*)` followed by a separate,
//    unlocked `INSERT` — N concurrent calls for the same bucket+key all
//    read the same pre-write count, all passed, and a burst fired with
//    `Promise.all` pushed the allowed count well past `max`. No mock can
//    prove this: the whole point is real transaction/advisory-lock
//    behavior under real concurrent database connections.
// 2. "A rejected checkout still burns a slot in the other bucket" —
//    checkRateLimits() must not record a hit in ANY of its listed buckets
//    unless EVERY one of them was under its limit; a bucket that itself
//    had room must not be charged just because a sibling dimension in the
//    same attempt was over limit.
//
// Needs a live database — same "against a real Postgres" requirement this
// task's own Verify section puts on the migration round-trip. Skips
// cleanly (not a failure) when DATABASE_URI isn't set, so `pnpm test` stays
// runnable without a live Postgres in an environment that doesn't have one;
// this repo's dev Postgres already exists at the URI apps/cms/.env.example
// documents. Run explicitly with e.g.:
//   DATABASE_URI=postgresql://user:pass@localhost:5432/playback_cms_dev pnpm test
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { sql } from '@payloadcms/db-postgres'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { checkRateLimit, checkRateLimits } from './rateLimit'

// One shared Payload instance for every test in this file, not one per
// test. `getPayload()` caches globally by `options.key` (default 'default')
// across the whole process (payload/dist/index.js) — a second call in the
// same process returns the SAME cached instance, not a fresh one. The
// first version of this file called getPayload() AND force-closed the
// pool's connections inside each individual test's own `finally` block;
// with two tests in one file (one process, node:test's default), the
// second test's "fresh" getPayload() call actually got back the first
// test's already-torn-down instance, and every query in the second test
// failed against a dead connection. Sharing one lazily-created instance
// and closing it exactly once, after every test in the file has run (see
// the `after()` hook at the bottom), avoids that entirely.
let sharedPayload: Payload | null = null

async function getTestPayload(): Promise<Payload> {
  if (sharedPayload) return sharedPayload

  // payload.config.ts throws at module-evaluation time if PAYLOAD_SECRET is
  // unset (a real, intentional guard — see its own comment) — a throwaway
  // value here is fine, this test never touches anything that value
  // actually secures (sessions, admin auth). Set before the dynamic
  // import below, since that's when the module body actually runs.
  process.env.PAYLOAD_SECRET ||= 'rate-limit-concurrency-test-secret-not-for-real-use'
  // Same reasoning scripts/check-migration-drift.ts documents in its own
  // header comment: @payloadcms/drizzle's connect.js pushes (drizzle-kit
  // push) the full schema whenever `NODE_ENV !== 'production' &&
  // PAYLOAD_MIGRATING !== 'true'`, and that push can drop into an
  // interactive confirm prompt with no stdin to answer it — exactly the
  // silent-hang failure mode that file exists to catch, hit for real while
  // writing this test against a locally-run node:test process. This test
  // only needs the existing, already-migrated schema (in particular
  // `rate_limit_hits`), never a push, so opt out of that path the same way.
  process.env.PAYLOAD_MIGRATING = 'true'

  const { getPayload } = await import('payload')
  const configModule = await import('../../payload.config')
  sharedPayload = await getPayload({ config: configModule.default })
  return sharedPayload
}

// Root-caused and confirmed live while writing this file: `payload.db.pool`
// (@payloadcms/db-postgres) is a real `pg.Pool`, but its own `connect.js`
// warms it up with one `pool.connect()` call whose client is never
// `.release()`d back — deliberate for a long-running server (that
// connection just lives for the app's whole lifetime), but it means
// `pool.end()` — which per pg-pool's own source only resolves once every
// checked-out client is gone, not just the idle ones — never resolves for
// a short-lived process like this test, since that one warm-up client can
// never become idle. Confirmed directly: `pool.totalCount` was 1,
// `pool.idleCount` was 0, immediately after `getPayload()` returned.
// Forcibly ending every client in the pool's own (undocumented but stable
// across this pg-pool version) `_clients` array sidesteps that wait
// entirely — each is a real `pg.Client`, and `.end()` on it closes its
// socket directly, regardless of the pool's idle/checked-out bookkeeping.
// This is test-only cleanup, never something production code should do.
async function closeSharedPayloadPool(): Promise<void> {
  if (!sharedPayload) return
  const adapter = sharedPayload.db as unknown as PostgresAdapter
  const clients = (adapter.pool as unknown as { _clients?: { end: () => Promise<void> }[] })._clients ?? []
  await Promise.all(clients.map((client) => client.end().catch(() => {})))
}

// Runs once, after every test in this file has finished — not per test
// (see sharedPayload's own comment for why per-test cleanup broke the
// second test). A no-op if DATABASE_URI was never set, since
// getTestPayload() (and therefore sharedPayload) was never reached.
after(closeSharedPayloadPool)

test('checkRateLimit: concurrent callers for the same key never exceed max', async (t) => {
  if (!process.env.DATABASE_URI) {
    t.skip("DATABASE_URI not set — see this file's header comment to run against a real Postgres")
    return
  }

  // getRateLimitConfig reads process.env fresh on every call (rateLimit.ts's
  // own comment: "so a test can set process.env before calling
  // checkRateLimit without needing to reset a module-level cache") — a
  // small, deterministic max for this run only, on a bucket this test
  // doesn't share with any other test file.
  const MAX = 5
  const CONCURRENCY = 20
  assert.ok(CONCURRENCY > MAX, 'test needs more concurrent callers than the limit for this to prove anything')
  process.env.RATE_LIMIT_CHECKOUT_IP_MAX = String(MAX)
  process.env.RATE_LIMIT_CHECKOUT_IP_WINDOW_MS = String(5 * 60_000)

  const payload = await getTestPayload()

  // Unique per test run so this can never collide with real traffic or a
  // previous (e.g. crashed) run of this same test against the same dev DB.
  const key = `rl-concurrency-test-${Date.now()}-${Math.random().toString(36).slice(2)}`

  try {
    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, () => checkRateLimit(payload, 'checkout_ip', key)),
    )

    const allowedCount = results.filter((allowed) => allowed === true).length
    assert.equal(
      allowedCount,
      MAX,
      `expected exactly ${MAX} of ${CONCURRENCY} truly concurrent calls for the same key to be allowed, got ${allowedCount} — a higher count means the check-then-insert race let more than max through`,
    )

    // Cross-check against the actual row count, independent of what
    // checkRateLimit's return values claimed — catches a bug where the
    // function's answer and what it actually wrote to the table disagree
    // (e.g. an allow without a matching insert, or the reverse).
    const adapter = payload.db as unknown as PostgresAdapter
    const rowCountResult = await adapter.drizzle.execute(
      sql`SELECT count(*)::int AS count FROM "rate_limit_hits" WHERE "bucket" = 'checkout_ip' AND "rate_key" = ${key}`,
    )
    const rowCount = Number((rowCountResult.rows[0] as { count?: number } | undefined)?.count ?? 0)
    assert.equal(rowCount, MAX, `expected exactly ${MAX} rows actually inserted for this key, got ${rowCount}`)
  } finally {
    const adapter = payload.db as unknown as PostgresAdapter
    await adapter.drizzle.execute(sql`DELETE FROM "rate_limit_hits" WHERE "rate_key" = ${key}`)
  }
})

// Proves the fix for review finding "a rejected checkout still burns a
// slot in the other bucket": checkRateLimits() must not record a hit in
// ANY of its listed buckets unless EVERY one of them was under its limit.
// Before this fix (two separate checkRateLimit() calls under Promise.all
// at each call site), a bucket that itself had room still recorded its own
// hit even when a sibling bucket in the same attempt was over limit and
// the attempt was rejected overall.
test('checkRateLimits: a bucket that had room records nothing when a sibling bucket in the same call is over its limit', async (t) => {
  if (!process.env.DATABASE_URI) {
    t.skip("DATABASE_URI not set — see this file's header comment to run against a real Postgres")
    return
  }

  // One bucket pre-exhausted (max 1, one hit already recorded before this
  // test's real call), one bucket with plenty of room and zero prior hits.
  process.env.RATE_LIMIT_CHECKOUT_IP_MAX = '1'
  process.env.RATE_LIMIT_CHECKOUT_IP_WINDOW_MS = String(5 * 60_000)
  process.env.RATE_LIMIT_CHECKOUT_PHONE_MAX = '5'
  process.env.RATE_LIMIT_CHECKOUT_PHONE_WINDOW_MS = String(5 * 60_000)

  const payload = await getTestPayload()

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const ipKey = `rl-sibling-test-ip-${suffix}`
  const phoneKey = `rl-sibling-test-phone-${suffix}`

  try {
    // Exhaust the IP bucket's single slot up front, via the same function
    // under test — this is the "sibling dimension is already over limit"
    // setup, not part of what's being measured below.
    const setupAllowed = await checkRateLimit(payload, 'checkout_ip', ipKey)
    assert.equal(setupAllowed, true, 'setup: the first hit against a fresh key with max=1 must be allowed')

    // The real assertion: checking [checkout_ip (now exhausted), checkout_phone
    // (empty)] together must reject the whole attempt...
    const allowed = await checkRateLimits(payload, [
      { bucket: 'checkout_ip', key: ipKey },
      { bucket: 'checkout_phone', key: phoneKey },
    ])
    assert.equal(allowed, false, 'expected the combined check to be rejected — the IP bucket is already at max')

    // ...and, critically, must NOT have recorded anything in the phone
    // bucket just because the phone bucket itself had room. Before the
    // fix, checkRateLimit's own record-on-pass behavior meant this row
    // would exist even though the overall attempt was rejected.
    const adapter = payload.db as unknown as PostgresAdapter
    const phoneRowCountResult = await adapter.drizzle.execute(
      sql`SELECT count(*)::int AS count FROM "rate_limit_hits" WHERE "bucket" = 'checkout_phone' AND "rate_key" = ${phoneKey}`,
    )
    const phoneRowCount = Number((phoneRowCountResult.rows[0] as { count?: number } | undefined)?.count ?? 0)
    assert.equal(
      phoneRowCount,
      0,
      `expected zero rows recorded in the checkout_phone bucket for a rejected attempt, got ${phoneRowCount} — a nonzero count means the sibling bucket was still charged for an attempt that didn't go through`,
    )
  } finally {
    const adapter = payload.db as unknown as PostgresAdapter
    await adapter.drizzle.execute(sql`DELETE FROM "rate_limit_hits" WHERE "rate_key" IN (${ipKey}, ${phoneKey})`)
  }
})
