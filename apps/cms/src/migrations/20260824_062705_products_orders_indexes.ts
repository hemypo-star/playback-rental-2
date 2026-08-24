import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE INDEX "products_available_idx" ON "products" USING btree ("available");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "products_available_idx";
  DROP INDEX "orders_status_idx";`)
}
