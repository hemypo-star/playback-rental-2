import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Media.imageSizes gained the `card` and `large` variants after the initial
// schema migration. Development schema push could create these columns, but a
// fresh production database that only runs committed migrations was still left
// with the original `thumbnail` columns. Payload then selected the configured
// fields and `/admin/media` failed at runtime with `sizes_card_url does not
// exist`.
//
// Keep this migration idempotent because local development may already have
// the columns from schema push.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_url" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_width" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_height" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_mime_type" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_filesize" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_card_filename" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_large_url" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_large_width" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_large_height" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_large_mime_type" varchar;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_large_filesize" numeric;
    ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sizes_large_filename" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_url";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_width";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_height";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_mime_type";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_filesize";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_card_filename";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_large_url";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_large_width";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_large_height";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_large_mime_type";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_large_filesize";
    ALTER TABLE "media" DROP COLUMN IF EXISTS "sizes_large_filename";
  `)
}
