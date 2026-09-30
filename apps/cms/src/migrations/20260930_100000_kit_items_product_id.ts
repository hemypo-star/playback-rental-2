import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Adds the products_kit_items.product_id column backing the new
// kitItems[].productId field (Products collection). Kit composition rows
// previously stored only a text label, so the kit editor could not restore
// the selected components on reload (it round-tripped the array row's own
// id instead) and the storefront had nothing to render component cards
// from. Nullable: existing kits keep their labels until re-saved.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_kit_items"
      ADD COLUMN IF NOT EXISTS "product_id" numeric;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "products_kit_items" DROP COLUMN IF EXISTS "product_id";
  `)
}
