import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// A new migration rather than editing 20260910_120000_rate_limit_hits, for
// the same reason 20260910_130000_rate_limit_hits_prune_idx already gave:
// that one may already be applied elsewhere.
//
// Fixes a real bug the *fix* for the drop-on-dev-push bug (see
// payload.config.ts's `tablesFilter` comment) turned up, confirmed live:
// `tablesFilter: ['!rate_limit_hits']` stops drizzle-kit's push-mode
// introspection from processing this table's own columns/indexes — but the
// original `"id" serial PRIMARY KEY` column owns a *separate* Postgres
// object, the `rate_limit_hits_id_seq` sequence, and drizzle-kit's
// Postgres introspection (drizzle-kit@0.31.7's pgPushIntrospect, inside
// `fromDatabase`) pulls the list of every sequence in the schema
// (`pg_sequences`) upfront, unconditionally — `tablesFilter` is never
// consulted for that query. A sequence only gets removed from that
// candidate list when the column that owns it is actually visited — which
// only happens for tables `tablesFilter` lets through. So filtering the
// *table* out doesn't just hide it from the diff, it also orphans its own
// sequence: drizzle-kit's diff sees a sequence that exists in the database
// but isn't declared anywhere in Payload's schema (correctly — this table
// was never a collection) and schedules a `DROP SEQUENCE` for it — which
// then hard-fails at push time (`cannot drop sequence ... because other
// objects depend on it`, since the still-present, still-filtered-in table
// depends on it) and crashes `next dev`'s first request instead of the
// quieter, but equally wrong, silent-drop bug `tablesFilter` was added to
// fix. Confirmed live: adding `tablesFilter` alone reproduces this exact
// error on a clean `pnpm dev` after `pnpm payload migrate`.
//
// Fix: stop the id column from owning a discoverable Postgres sequence at
// all. `id` is a synthetic key nothing in this codebase ever reads back
// (`lib/security/rateLimit.ts` only ever inserts/selects/deletes by
// bucket/rate_key/created_at, confirmed via grep) — there's no FK pointing
// at it, so swapping its generation strategy is safe. A random `uuid`
// default (`gen_random_uuid()`, built into Postgres 13+ core, no extension
// needed — this project runs postgres:17-alpine) needs no backing sequence
// object, so there's nothing left for drizzle-kit's push to see as
// "orphaned" once `rate_limit_hits` itself is filtered out.
//
// IF EXISTS/IF NOT EXISTS — same reasoning as 20260910_120000's own down()
// and 20260910_130000: a dev-mode push can diverge the actual table state
// from what `payload_migrations` believes is applied, so both directions
// tolerate the table (or the now-defunct sequence) already being in the
// post-migration shape.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "rate_limit_hits" ALTER COLUMN "id" DROP DEFAULT;
  ALTER TABLE "rate_limit_hits" ALTER COLUMN "id" TYPE uuid USING gen_random_uuid();
  ALTER TABLE "rate_limit_hits" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
  DROP SEQUENCE IF EXISTS "rate_limit_hits_id_seq";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "rate_limit_hits" ALTER COLUMN "id" DROP DEFAULT;
  CREATE SEQUENCE IF NOT EXISTS "rate_limit_hits_id_seq";
  ALTER TABLE "rate_limit_hits" ALTER COLUMN "id" TYPE integer USING (nextval('rate_limit_hits_id_seq'));
  ALTER TABLE "rate_limit_hits" ALTER COLUMN "id" SET DEFAULT nextval('rate_limit_hits_id_seq');
  ALTER SEQUENCE "rate_limit_hits_id_seq" OWNED BY "rate_limit_hits"."id";`)
}
