import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// A2 review fix (design_handoff_swiss_bento/08-instruction.md, audit G1) —
// a *new* migration rather than editing 20260910_120000_rate_limit_hits,
// since that one may already be applied elsewhere.
//
// rateLimit.ts's cron-free prune (`DELETE ... WHERE created_at < now() -
// interval '2 days'`) has only the composite `(bucket, rate_key,
// created_at)` index from the original migration to work with. That index
// is btree-ordered on `bucket` first, then `rate_key`, then `created_at` —
// useful for the check query (`WHERE bucket = ? AND rate_key = ? AND
// created_at > ?`, which binds the leading columns), completely useless for
// the prune's `WHERE created_at < ?` on its own, since a predicate that
// doesn't bind a composite index's leading column(s) can't use it at all.
// The prune degrades to a sequential scan on every table row on the same
// Postgres instance that serves products/orders — worth a dedicated
// single-column index instead of leaving that scan in place.
// IF NOT EXISTS / IF EXISTS — same guard, and same reason, as
// 20260910_120000_rate_limit_hits's own down() (see its comment): a
// dev-mode push can diverge the actual table/index state from what
// `payload_migrations` believes is applied, and this index lives on the
// same table that migration's `down` now tolerates being already absent.
// The dev push no longer drops `rate_limit_hits` itself (payload.config.ts's
// `postgresAdapter({ tablesFilter: ['!rate_limit_hits'] })` excludes it from
// the push's introspection entirely, so this index rides along excluded too)
// — this migration's own idempotency still stands on its own merits, but the
// scenario that originally motivated it is fixed at the source now.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE INDEX IF NOT EXISTS "rate_limit_hits_created_at_idx" ON "rate_limit_hits" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "rate_limit_hits_created_at_idx";`)
}
