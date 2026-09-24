import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — adds the two
// numeric fields (`businessHoursOpen`/`businessHoursClose`,
// apps/cms/src/globals/SiteSettings.ts) that the date picker's time grid and
// its "Рабочие часы …" caption both now read from a single source, instead
// of the old `BUSINESS_HOURS = { open: 9, close: 21 }` constant (then in
// lib/dateRange.ts, deleted 2026-09-24) disagreeing with a hardcoded
// "10:00 — 21:00" string in the picker's own JSX. Both values are threaded
// as props today; the picker is prototype/PrototypeDatePicker.tsx.
//
// `numeric`, matching every other Payload `type: 'number'` field on this
// table's family (e.g. products.price/quantity — see
// 20260814_042950_initial_schema.ts) rather than `integer`; Payload's own
// schema generation always maps `number` fields this way, so this keeps the
// column type Payload would itself produce for the same field.
//
// Defaults (10, 21) — not the old code's wrong 9 — match this same global's
// pre-existing `contactHours` text field's own default ('10:00 — 21:00',
// see the same initial migration), which is the one place in this repo that
// already stated the real hours before this fix; see the B4 commit's own
// description for the full "which default" reasoning. A fresh column with a
// default backfills every existing row (this table only ever has the one
// singleton row for a Payload Global) without a separate UPDATE statement.
//
// IF NOT EXISTS / IF EXISTS — same guard, same reason, as every migration
// since 20260910_120000_rate_limit_hits's down(): a dev-mode drizzle-kit
// push can diverge the actual table shape from what `payload_migrations`
// believes is applied, in either direction, so both up and down tolerate
// the column already being in its post-migration shape.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "business_hours_open" numeric DEFAULT 10;
  ALTER TABLE "site_settings" ADD COLUMN IF NOT EXISTS "business_hours_close" numeric DEFAULT 21;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "business_hours_open";
  ALTER TABLE "site_settings" DROP COLUMN IF EXISTS "business_hours_close";`)
}
