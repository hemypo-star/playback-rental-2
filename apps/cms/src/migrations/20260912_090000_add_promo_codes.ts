import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Backlog item 5 (docs/ROADMAP-2.0.md, promo codes). New `PromoCodes`
// collection (a real Payload collection, unlike rate_limit_hits — so it
// goes through the normal push/introspection path, not `tablesFilter`) plus
// two new sidebar fields on `orders` (promoCode/promoDiscount, see
// collections/Orders.ts).
//
// DDL below is not guessed — verified by bringing up a scratch Postgres,
// letting `next dev`'s push-mode schema sync create the schema from this
// exact set of collection/field changes, and dumping the resulting table/
// enum/index/constraint definitions with `pg_dump --schema-only`. This
// migration reproduces that dump byte-for-byte (column types/defaults,
// index names, FK names/ON DELETE behavior). Separately migration-tested on
// a second, clean scratch database: `up` (matches the same shape), `down`
// (clean removal, confirmed via psql \d/\dT+ that promo_codes, its enum,
// and the two orders columns are all gone and payload_locked_documents_rels
// lost its promo_codes_id column), `up` again (idempotent — see the IF
// [NOT] EXISTS guards below, same convention as every migration since
// 20260910_120000_rate_limit_hits for the same dev-push-divergence reason:
// a `next dev` cold start's schema push can diverge the live database from
// what `payload_migrations` believes is applied, in either direction).
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
   CREATE TYPE "public"."enum_promo_codes_discount_type" AS ENUM('percent', 'fixed');
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;

  CREATE TABLE IF NOT EXISTS "promo_codes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" varchar NOT NULL,
  	"discount_type" "enum_promo_codes_discount_type" DEFAULT 'percent' NOT NULL,
  	"discount_value" numeric NOT NULL,
  	"active" boolean DEFAULT true,
  	"valid_until" timestamp(3) with time zone,
  	"description" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "promo_codes_id" integer;
  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promo_code" varchar;
  ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promo_discount" numeric DEFAULT 0;

  DO $$ BEGIN
   ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_promo_codes_fk" FOREIGN KEY ("promo_codes_id") REFERENCES "public"."promo_codes"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
   WHEN duplicate_object THEN null;
  END $$;

  CREATE UNIQUE INDEX IF NOT EXISTS "promo_codes_code_idx" ON "promo_codes" USING btree ("code");
  CREATE INDEX IF NOT EXISTS "promo_codes_updated_at_idx" ON "promo_codes" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "promo_codes_created_at_idx" ON "promo_codes" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_promo_codes_id_idx" ON "payload_locked_documents_rels" USING btree ("promo_codes_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_promo_codes_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_promo_codes_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "promo_codes_id";
  ALTER TABLE "orders" DROP COLUMN IF EXISTS "promo_code";
  ALTER TABLE "orders" DROP COLUMN IF EXISTS "promo_discount";
  DROP TABLE IF EXISTS "promo_codes" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_promo_codes_discount_type";`)
}
