import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Wave 4 added Payload upload `card` / `large` imageSizes to Media, but the
// recovered migration history still described only the original `thumbnail`
// size. Fresh production-like databases therefore generated types expecting
// these fields while PostgreSQL had no matching columns. Keep this migration
// explicit so existing deployments gain the columns without relying on dev
// schema push.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      ADD COLUMN IF NOT EXISTS "sizes_card_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_card_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_card_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_card_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_card_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_card_filename" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_large_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_large_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_large_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_large_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_large_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_large_filename" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      DROP COLUMN IF EXISTS "sizes_card_url",
      DROP COLUMN IF EXISTS "sizes_card_width",
      DROP COLUMN IF EXISTS "sizes_card_height",
      DROP COLUMN IF EXISTS "sizes_card_mime_type",
      DROP COLUMN IF EXISTS "sizes_card_filesize",
      DROP COLUMN IF EXISTS "sizes_card_filename",
      DROP COLUMN IF EXISTS "sizes_large_url",
      DROP COLUMN IF EXISTS "sizes_large_width",
      DROP COLUMN IF EXISTS "sizes_large_height",
      DROP COLUMN IF EXISTS "sizes_large_mime_type",
      DROP COLUMN IF EXISTS "sizes_large_filesize",
      DROP COLUMN IF EXISTS "sizes_large_filename";
  `)
}
