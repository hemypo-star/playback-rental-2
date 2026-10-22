import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Audit stage 4 (2026-10-21): the migrated schema had drifted from what
// Payload builds from the collections (found by diffing a migrated database
// against a dev-push one):
// - products.last_synced_ms_values was created as json; Payload expects jsonb.
// - site_settings.contact_address still defaulted to the address without
//   "офис 33" (only the default; stored values are untouched).
// - the media image-size filename indexes Payload declares were never created.
// users.lock_until / login_attempts are left alone: unused (maxLoginAttempts
// is 0) and harmless.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products" ALTER COLUMN "last_synced_ms_values" TYPE jsonb USING "last_synced_ms_values"::jsonb;
    ALTER TABLE "site_settings" ALTER COLUMN "contact_address" SET DEFAULT 'г. Кемерово, ул. Демьяна Бедного, 6, офис 33';
    CREATE INDEX IF NOT EXISTS "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
    CREATE INDEX IF NOT EXISTS "media_sizes_large_sizes_large_filename_idx" ON "media" USING btree ("sizes_large_filename");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "media_sizes_card_sizes_card_filename_idx";
    DROP INDEX IF EXISTS "media_sizes_large_sizes_large_filename_idx";
    ALTER TABLE "site_settings" ALTER COLUMN "contact_address" SET DEFAULT 'г. Кемерово, ул. Демьяна Бедного, 6';
    ALTER TABLE "products" ALTER COLUMN "last_synced_ms_values" TYPE json USING "last_synced_ms_values"::json;
  `)
}
