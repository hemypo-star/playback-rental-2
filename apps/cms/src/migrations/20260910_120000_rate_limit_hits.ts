import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// A2 (design_handoff_swiss_bento/08-instruction.md — rate-limiting half
// only, see docs/DEV-LOG.md's A2 entry for the booking-lifetime half that
// was explicitly ruled out). Backs lib/security/rateLimit.ts's sliding-
// window counter for checkout (by IP and by phone), the contact form (by
// IP), and admin login (by IP).
//
// Deliberately NOT a Payload collection: this is ephemeral counter data
// with no admin-UI/access-control/revisioning need, so it's a bare table
// hand-written the same way `check-migration-drift.ts` and
// `lib/rental/availability.ts`'s `lockProductForBooking` already reach
// below Payload's collection abstraction for non-collection concerns — see
// those files' own comments for the precedent. Because it isn't part of any
// collection's declared schema, it intentionally has no matching
// `<name>.json` drizzle-kit snapshot alongside this file: `payload migrate`
// (payload/dist/database/migrations/readMigrationFiles.js) only ever reads
// the `.ts`/`.js` migration files themselves, never the `.json` snapshots —
// those exist solely for `payload migrate:create`'s future schema diffing,
// and that diff is computed against Payload's *declared* collection/global
// schema, which this table was never part of. Adding a fabricated snapshot
// entry for a table `migrate:create` would never generate on its own could
// only make that diffing worse, not better.
// IF NOT EXISTS / IF EXISTS throughout (review finding, live-tested): this
// table sits below Payload's own schema-drift tracking (see the comment
// above), so `payload_migrations` recording this migration as applied is
// not proof the table itself is still there — a `next dev` cold start's
// push-mode schema sync (`NODE_ENV !== 'production' && PAYLOAD_MIGRATING
// !== 'true'`, apps/cms/src/scripts/check-migration-drift.ts's own header
// comment) can diverge from it independently, since push syncs against
// Payload's *declared* schema, which never knew this table existed either.
// Without IF EXISTS, a `down` against a database where the table is
// already gone throws (`table "rate_limit_hits" does not exist`) instead
// of completing — and since `payload_migrations` still shows this
// migration as applied, `payload migrate` (up) then no-ops instead of
// re-creating it, leaving `migrate:fresh` (which wipes the entire
// database) as the only path that actually worked in that live test. IF
// EXISTS/IF NOT EXISTS make both directions idempotent against that drift
// instead of demanding the database and payload_migrations agree with each
// other.
//
// That divergence used to be worse than "idempotent migrations paper over
// it": the push itself would flat-out DROP this table (it introspects the
// whole database and removes anything absent from Payload's declared
// schema — this one never was part of it), which is what actually made a
// plain `pnpm dev` after `pnpm payload migrate` silently disable rate
// limiting. Fixed at the source via `postgresAdapter`'s `tablesFilter` in
// payload.config.ts, not here — if you ever add another bare, non-collection
// table the way this one is, add its name to that filter too and update its
// comment, or it will hit the exact same drop.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"bucket" varchar(64) NOT NULL,
  	"rate_key" varchar(255) NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  CREATE INDEX IF NOT EXISTS "rate_limit_hits_bucket_key_created_idx" ON "rate_limit_hits" USING btree ("bucket","rate_key","created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE IF EXISTS "rate_limit_hits" CASCADE;`)
}
