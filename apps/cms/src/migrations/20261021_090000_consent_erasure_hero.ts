import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Audit stage 3 (2026-10-21):
// - orders.consent_at / consent_documents: proof of the customer's consent at
//   checkout (152-FZ art. 9), written by the checkout Server Action.
// - orders.personal_data_erased_at / _by: stamp left when an admin blanks a
//   customer's contacts after consent is withdrawn (art. 21).
// - site_settings.hero_headline: the storefront promised "без залога" while
//   the user agreement requires a 30% deposit; the owner chose to drop the
//   claim. Only the untouched default is replaced — a headline the owner
//   typed in the admin is left alone.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "consent_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "consent_documents" varchar,
      ADD COLUMN IF NOT EXISTS "personal_data_erased_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "personal_data_erased_by" varchar;
    ALTER TABLE "site_settings" ALTER COLUMN "hero_headline" SET DEFAULT 'Прокат техники для съёмки';
    UPDATE "site_settings" SET "hero_headline" = 'Прокат техники для съёмки'
      WHERE "hero_headline" = 'Техника для съёмки без залога';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "consent_at",
      DROP COLUMN IF EXISTS "consent_documents",
      DROP COLUMN IF EXISTS "personal_data_erased_at",
      DROP COLUMN IF EXISTS "personal_data_erased_by";
    ALTER TABLE "site_settings" ALTER COLUMN "hero_headline" SET DEFAULT 'Техника для съёмки без залога';
  `)
}
