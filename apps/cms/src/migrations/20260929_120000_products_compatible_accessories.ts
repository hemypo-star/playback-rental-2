import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

// Adds the products.compatibleAccessories field (hasMany relationship to
// products). Payload's postgres adapter stores hasMany relationships inside
// the existing <collection>_rels table as an ordered row per relation with a
// distinguishing `path` value — same mechanism as the images field already
// uses ("images"). So this migration only needs to teach payload_locked_-
// documents_rels about the self-referencing products link used by doc locks;
// no new table/column on products itself.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // products_rels gains rows with path='compatibleAccessories' and a
  // products_id column next to the existing media_id. Drizzle's rels table
  // for a collection that now relates to two targets gets both FK columns.
  await db.execute(sql`
    ALTER TABLE "products_rels"
      ADD COLUMN IF NOT EXISTS "products_id" integer;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "products_rels"
        ADD CONSTRAINT "products_rels_products_fk"
        FOREIGN KEY ("products_id") REFERENCES "public"."products"("id")
        ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "products_rels_products_id_idx"
      ON "products_rels" USING btree ("products_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS "products_rels_products_id_idx";`)
  await db.execute(sql`ALTER TABLE "products_rels" DROP CONSTRAINT IF EXISTS "products_rels_products_fk";`)
  await db.execute(sql`ALTER TABLE "products_rels" DROP COLUMN IF EXISTS "products_id";`)
}
