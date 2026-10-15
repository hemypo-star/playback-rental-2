import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// SEC-008 (payload 3.88 -> 3.90 security upgrade): Payload 3.90 adds
// users.reset_password_requested_at for its forgot-password throttling and
// selects it on every users query, so without this column login, /cms and
// /admin/first-register fail with "column does not exist". Nullable, no
// backfill needed.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "reset_password_requested_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "users" DROP COLUMN IF EXISTS "reset_password_requested_at";
  `)
}
