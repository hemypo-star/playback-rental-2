import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Adds the sync-baseline column backing lastSyncedMsValues (see Products.ts):
// a snapshot of the МойСклад-sourced values the previous sync run imported
// for fields that are editable in the admin UI (title/description/category/
// images). upsertProduct() compares current local values against this
// snapshot to decide whether a field was hand-edited — if it was, the next
// sync leaves it alone instead of overwriting the storefront copy.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      ADD COLUMN IF NOT EXISTS "last_synced_ms_values" json;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products"
      DROP COLUMN IF EXISTS "last_synced_ms_values";
  `)
}
