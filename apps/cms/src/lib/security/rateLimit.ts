import { sql } from '@payloadcms/db-postgres'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { createHash } from 'node:crypto'

// A2 (design_handoff_swiss_bento/08-instruction.md, audit finding G1) — the
// rate-limiting half only. The instruction's other half (a `holdUntil`
// field, an `expired` order status, a cron sweep, an admin "истекающие
// брони" filter) was explicitly ruled out by the owner: every order is
// processed manually as soon as the notification webhook fires, so a stale
// unconfirmed order sitting around isn't a real scenario here. Don't extend
// this module toward that — see CLAUDE.md's A2 dev log entry.
//
// Storage: a bare Postgres table (`rate_limit_hits`, migration
// 20260910_120000_rate_limit_hits, index added in
// 20260910_130000_rate_limit_hits_prune_idx), not an in-memory Map (this
// app restarts its container often — `restart: unless-stopped`, dozens of
// `docker compose up --build` cycles across this project's own history —
// so an in-memory counter would hand out a free full-quota burst after
// every redeploy) and not Redis (nothing else in this stack uses it; one
// counter table doesn't justify introducing it). Reached via the same raw
// `db.execute(sql\`...\`)` pattern `lockProductForBooking`
// (lib/rental/availability.ts) already established for exactly this kind of
// "not a Payload collection" data.
export type RateLimitBucket =
  | 'checkout_ip'
  | 'checkout_phone'
  | 'contact_ip'
  | 'contact_email'
  | 'login_ip'
  | 'login_account'
  | 'forgot_password_ip'
  | 'forgot_password_account'
  | 'unlock_ip'
  | 'unlock_account'

export interface RateLimitConfig {
  /** Sliding window size in milliseconds. */
  windowMs: number
  /** Max allowed hits within the window, inclusive of the current attempt. */
  max: number
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

// Read once per call (not cached at module scope) so a test can set
// process.env before calling checkRateLimit without needing to reset a
// module-level cache. Defaults are deliberately generous — biased toward
// never blocking a real customer (a household booking two cameras from one
// flat, or someone who calls back within the hour to add an item) over
// catching every possible abuse pattern. See apps/cms/.env.example for the
// operator-facing documentation of each of these.
export function getRateLimitConfig(bucket: RateLimitBucket): RateLimitConfig {
  switch (bucket) {
    case 'checkout_ip':
      return {
        max: envInt('RATE_LIMIT_CHECKOUT_IP_MAX', 5),
        windowMs: envInt('RATE_LIMIT_CHECKOUT_IP_WINDOW_MS', HOUR_MS),
      }
    case 'checkout_phone':
      return {
        max: envInt('RATE_LIMIT_CHECKOUT_PHONE_MAX', 5),
        windowMs: envInt('RATE_LIMIT_CHECKOUT_PHONE_WINDOW_MS', HOUR_MS),
      }
    case 'contact_ip':
      return {
        max: envInt('RATE_LIMIT_CONTACT_IP_MAX', 5),
        windowMs: envInt('RATE_LIMIT_CONTACT_IP_WINDOW_MS', HOUR_MS),
      }
    case 'contact_email':
      return {
        max: envInt('RATE_LIMIT_CONTACT_EMAIL_MAX', 5),
        windowMs: envInt('RATE_LIMIT_CONTACT_EMAIL_WINDOW_MS', HOUR_MS),
      }
    case 'login_ip':
      return {
        max: envInt('RATE_LIMIT_LOGIN_IP_MAX', 10),
        windowMs: envInt('RATE_LIMIT_LOGIN_IP_WINDOW_MS', 15 * MINUTE_MS),
      }
    case 'login_account':
      // Survives TRUST_PROXY_HEADERS being off (see clientIp.ts) — this is
      // the dimension that still protects a specific admin account from
      // brute-forcing when the IP dimension can't be checked at all,
      // instead of every visitor sharing one 'unknown' bucket.
      return {
        max: envInt('RATE_LIMIT_LOGIN_ACCOUNT_MAX', 10),
        windowMs: envInt('RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_MS', 15 * MINUTE_MS),
      }
    case 'forgot_password_ip':
      return {
        max: envInt('RATE_LIMIT_FORGOT_PASSWORD_IP_MAX', 5),
        windowMs: envInt('RATE_LIMIT_FORGOT_PASSWORD_IP_WINDOW_MS', HOUR_MS),
      }
    case 'forgot_password_account':
      return {
        max: envInt('RATE_LIMIT_FORGOT_PASSWORD_ACCOUNT_MAX', 5),
        windowMs: envInt('RATE_LIMIT_FORGOT_PASSWORD_ACCOUNT_WINDOW_MS', HOUR_MS),
      }
    case 'unlock_ip':
      return {
        max: envInt('RATE_LIMIT_UNLOCK_IP_MAX', 5),
        windowMs: envInt('RATE_LIMIT_UNLOCK_IP_WINDOW_MS', HOUR_MS),
      }
    case 'unlock_account':
      return {
        max: envInt('RATE_LIMIT_UNLOCK_ACCOUNT_MAX', 5),
        windowMs: envInt('RATE_LIMIT_UNLOCK_ACCOUNT_WINDOW_MS', HOUR_MS),
      }
  }
}

// `payload.db` is declared as a generic DatabaseAdapter — this app only
// ever runs @payloadcms/db-postgres, so the cast just asserts the concrete
// adapter type, same justification lockProductForBooking's own comment
// gives (availability.ts) and check-migration-drift.ts's use of the same
// adapter for the same reason.
function getAdapter(payload: Payload): PostgresAdapter {
  return payload.db as unknown as PostgresAdapter
}

// rate_key is varchar(255) (migration 20260910_120000_rate_limit_hits). A
// Server Action is independently POST-able regardless of what the browser
// form limits, so e.g. checkout's customerPhone (fed into
// normalizePhoneForRateLimit's fallthrough branch) can carry an arbitrary-
// length digit string. Without a cap, the SELECT below succeeds (reporting
// 0 — no prior rows can possibly match an over-length value that was never
// inserted before) and the subsequent INSERT then throws on the column's
// length constraint: fails closed and leaks nothing, but it's avoidable
// noise, and it happens *after* the advisory lock below is taken, holding
// it uselessly until the transaction unwinds. Cap once, here, for every
// caller and every bucket, rather than trusting each call site to remember.
//
// Hashing (not truncating) an over-length key avoids a different bug a
// naive slice(0, 255) would introduce: two different over-length values
// sharing the first 255 characters would collide into the same bucket.
// Ordinary keys (an IP, a normalized phone/email) are always far under this
// limit and pass through unchanged, so no test or real request ever
// observes an 'rl:' key today — hashing only ever activates on abuse input.
const MAX_RATE_KEY_LENGTH = 255

function capRateLimitKey(key: string): string {
  if (key.length <= MAX_RATE_KEY_LENGTH) return key
  return `rl:${createHash('sha256').update(key).digest('hex')}`
}

// Advisory-lock id for a given bucket+key pair. pg_advisory_xact_lock's
// two-int32-argument form combines both into one 64-bit lock key with the
// first argument as the high 32 bits — using a fixed non-zero `classid`
// (1) here means every rate-limit lock lives in the upper half of that
// 64-bit space, which lockProductForBooking's own single-bigint calls
// (lib/rental/availability.ts, `pg_advisory_xact_lock(productId)` — a
// small, low-valued product id, always < 2^31, i.e. high 32 bits = 0) can
// never collide with. `hashtext` reduces the bucket+key string to an int4;
// two different keys hashing to the same int4 only cause extra, harmless
// serialization between unrelated keys, never an incorrect allow/deny.
function lockStatementSql(bucket: RateLimitBucket, key: string) {
  const composite = `${bucket}:${key}`
  return sql`SELECT pg_advisory_xact_lock(1, hashtext(${composite}))`
}

export interface RateLimitCheck {
  bucket: RateLimitBucket
  key: string
}

// One rate-limited attempt is often gated on more than one dimension at
// once (checkout: IP *and* phone; login/forgotPassword/unlock: IP *and*
// the targeted account) — this is the entry point for that: every relevant
// (bucket, key) pair for one attempt, checked and — only if every single
// one is currently under its own limit — recorded together, atomically,
// in one transaction. Returns true (and records a hit in every listed
// bucket) only when ALL of them were under limit; false (and records
// nothing, in ANY of them) if even one was over.
//
// Review fix (live-tested): the original single-key `checkRateLimit`
// recorded its own hit the moment IT passed, independent of any other
// dimension being checked alongside it in the same `Promise.all` at the
// call site. Two concrete bugs followed from that: (1) when only one
// dimension was actually over its limit, the *other* dimension still
// recorded a hit for an attempt that then got rejected anyway — a real
// customer's phone-dimension budget (say) draining for reasons that had
// nothing to do with their phone, because their IP happened to be shared
// with someone else's abuse; (2) more generally, any attempt that got
// rate-limited on ANY dimension still spent every OTHER dimension's slot,
// so "a rejected attempt does not consume a slot" (this module's own
// original design intent, still true for a single-bucket check) silently
// stopped holding the moment two dimensions were checked together. Fixed
// by locking every involved key up front, deciding once across all of
// them, and only then writing — nothing is ever written for a set of
// checks that isn't unanimously allowed.
//
// Where the record sits relative to the rest of the caller's flow is a
// deliberate choice, not incidental: every call site invokes this
// immediately before doing the real work it protects (creating the order,
// looking up the login/forgotPassword/unlock target, sending the contact
// notification) — recording happens at exactly that boundary, not after
// the real work finishes. Recording only after full success (e.g. only
// once an order is actually created) would mean a caller who reliably
// trips a *later*, unrelated failure (a bad date range, a sold-out
// product, a malformed contact field) is never counted at all — its own
// abuse path, and a worse one than the bug this fixes, since it has no
// budget ceiling at all. Recording at the "rate limit passed, now actually
// attempting it" boundary means a validation/availability failure after
// this point still spends the slot (unchanged from before this fix) but
// two dimensions checked together no longer charge each other for one
// side's rejection. That's the middle ground between "charge on any
// attempt" and "charge only on full success."
//
// Atomicity (the actual point of this function, same as the single-key
// version's own original reasoning): the lock/count/insert steps for every
// listed key all run inside one real database transaction
// (`payload.db.beginTransaction()`/`commitTransaction()`/
// `rollbackTransaction()` — the same lifecycle methods Payload's own
// operations use internally, verified against @payloadcms/drizzle's
// source rather than assumed; NOT the same thing as sharing an ambient
// `req.transactionID`, since this function is often called with no
// in-flight Payload operation to inherit one from). Locks for every key are
// acquired up front, in a fixed, deterministic order — sorted by
// `bucket:key` — before any count is read; two concurrent calls that both
// involve the same pair of keys therefore always attempt to acquire them
// in the same relative order, which is what rules out a lock-ordering
// deadlock between them (Postgres would otherwise legitimately detect and
// abort one side of a genuine circular wait). A concurrent call sharing
// even one key with this one blocks on that key's lock until this
// transaction actually commits (releasing every lock it holds) or rolls
// back, so it can never read a count from before this call's own decision
// landed — the same per-key serialization guarantee the original
// single-key function had, now extended to hold across a whole
// multi-dimension decision instead of separately per dimension.
export async function checkRateLimits(payload: Payload, checks: RateLimitCheck[]): Promise<boolean> {
  if (checks.length === 0) return true

  const adapter = getAdapter(payload)
  const now = Date.now()
  const prepared = checks.map((check) => {
    const config = getRateLimitConfig(check.bucket)
    return {
      bucket: check.bucket,
      rateKey: capRateLimitKey(check.key),
      config,
      cutoff: new Date(now - config.windowMs).toISOString(),
    }
  })
  // Deterministic lock-acquisition order — see the function comment above.
  const lockOrder = [...prepared].sort((a, b) => {
    const aId = `${a.bucket}:${a.rateKey}`
    const bId = `${b.bucket}:${b.rateKey}`
    return aId < bId ? -1 : aId > bId ? 1 : 0
  })

  const transactionID = await adapter.beginTransaction()
  const sessionKey = transactionID === null ? null : String(transactionID)
  const session = sessionKey ? adapter.sessions[sessionKey] : undefined
  if (!sessionKey || !session) {
    // Every adapter this app ships with (@payloadcms/db-postgres) supports
    // transactions, so this should be unreachable in practice — but if a
    // future adapter swap ever changed that (beginTransaction's own return
    // type is `null | number | string`, with `null` Payload's own signal
    // for "this adapter doesn't do transactions"), failing loudly here is
    // far safer than silently falling back to unlocked statements. Per
    // this task's own note: "if you cannot get a real transaction, say so
    // and use an atomic single-statement approach instead" — this repo's
    // adapter does give a real transaction, so that fallback isn't needed,
    // but this guard exists so a future change that broke that assumption
    // fails fast in CI/tests rather than silently reintroducing the race.
    throw new Error('checkRateLimits: database adapter did not provide a transaction (see rateLimit.ts)')
  }

  const db = session.db

  try {
    // Phase 1: acquire every lock, in the fixed order, before reading any
    // count — sequential `await`s, not `Promise.all`, so the statements
    // are sent to this transaction's single connection in that exact order
    // regardless of how the JS engine schedules the promises.
    for (const c of lockOrder) {
      await db.execute(lockStatementSql(c.bucket, c.rateKey))
    }

    // Phase 2: with every relevant key now locked for the duration of this
    // transaction, check every dimension against a single, consistent
    // snapshot of the table — no other transaction touching any of these
    // keys can commit a write in between.
    let allowed = true
    for (const c of prepared) {
      const countResult = await db.execute(
        sql`SELECT count(*)::int AS count FROM "rate_limit_hits" WHERE "bucket" = ${c.bucket} AND "rate_key" = ${c.rateKey} AND "created_at" > ${c.cutoff}::timestamptz`,
      )
      const count = Number((countResult.rows[0] as { count?: number } | undefined)?.count ?? 0)
      if (count >= c.config.max) {
        allowed = false
        break
      }
    }

    if (!allowed) {
      // Nothing written to any bucket — commit (equivalent to rollback
      // here, since there were no writes) to release every lock and end
      // the transaction rather than leaving it open.
      await adapter.commitTransaction(sessionKey)
      return false
    }

    // Phase 3: every dimension had room — record a hit in every one of
    // them, together, in the same transaction that just checked them.
    for (const c of prepared) {
      await db.execute(sql`INSERT INTO "rate_limit_hits" ("bucket", "rate_key") VALUES (${c.bucket}, ${c.rateKey})`)
    }
    await adapter.commitTransaction(sessionKey)
  } catch (err) {
    await adapter.rollbackTransaction(sessionKey)
    throw err
  }

  // Cron-free cleanup (per A2's own constraint: no daemon for this
  // feature). Deliberately outside the transaction above and on the plain
  // (non-transactional) connection: this is an unrelated, opportunistic
  // bulk delete, not part of the check-then-insert critical section, and
  // running it inside that transaction would hold every lock above (and
  // the row lock semantics the DELETE itself needs) for longer than the
  // logic that actually needs serializing. Old rows only matter for as
  // long as the longest configured window, so a low-probability sweep on
  // the write path keeps the table from growing unbounded. Migration
  // 20260910_130000_rate_limit_hits_prune_idx adds an index this DELETE's
  // WHERE clause can actually use — the original composite index
  // (bucket, rate_key, created_at) is unusable here since this predicate
  // binds none of its leading columns.
  if (Math.random() < 0.01) {
    await adapter.drizzle.execute(sql`DELETE FROM "rate_limit_hits" WHERE "created_at" < now() - interval '2 days'`)
  }

  return true
}

// Convenience wrapper for the common single-dimension case — identical
// behavior to calling checkRateLimits with a one-element array, kept so a
// call site gating on exactly one bucket (and this module's own tests)
// doesn't have to build an array literal for it. See checkRateLimits for
// the actual implementation and all of the atomicity/recording reasoning;
// nothing about a single check changes any of that, it's the N=1 case of
// the same function.
export async function checkRateLimit(payload: Payload, bucket: RateLimitBucket, key: string): Promise<boolean> {
  return checkRateLimits(payload, [{ bucket, key }])
}
