// Pre-flight check run before `payload migrate` in apps/cms/Dockerfile's
// runtime CMD. Confirmed live (docs/audits/2026-08-24-baseline.md,
// DEPLOY-001): if the target database has ever had `pnpm dev`'s push:true
// schema sync run against it, Payload's own migrate CLI finds a sentinel
// row (`payload_migrations` with `batch = -1`) and drops into an
// interactive confirm prompt (@payloadcms/drizzle's migrate.js, via the
// `prompts` package) asking whether to proceed and accept data loss. A
// container started via `docker compose up -d` has no attached stdin —
// confirmed live that even redirecting `< /dev/null` doesn't make the
// prompt library fail fast, it just hangs forever waiting for keypress
// events that will never come. The container then sits at `unhealthy`
// indefinitely with no crash, no restart, and no log line loud enough to
// get noticed without someone specifically going to read the logs.
//
// This script turns that silent hang into a fast, loud failure: same
// underlying check migrate.js does internally, run first, with a real exit
// code and an explanation of what to actually do about it.
//
// That same dev-mode push is also the mechanism behind a separate, earlier
// symptom (not this script's concern to detect, since it manifests on the
// `pnpm dev` side, before the sentinel it plants would ever reach this
// production-only check): the push introspects the *entire* database and
// drops any table absent from Payload's Drizzle-generated schema, which
// includes `rate_limit_hits` — a bare, hand-authored table (migrations
// 20260910_120000_rate_limit_hits / _prune_idx) that was never declared as
// a Payload collection. Left unfiltered, an ordinary `pnpm payload migrate`
// then `pnpm dev` would silently drop it and disable rate limiting on
// checkout/contact/admin-login. Fixed via `postgresAdapter`'s
// `tablesFilter` in payload.config.ts (see its comment for the mechanism)
// — noted here because it's the same push this script exists to guard
// against the *other* consequence of, not because this script does
// anything about it itself.
//
// PAYLOAD_MIGRATING=true must be set *before* `payload`/`@payload-config`
// are ever evaluated, not just before getPayload() is called — db-postgres's
// connect.js pushes schema whenever `NODE_ENV !== 'production' &&
// PAYLOAD_MIGRATING !== 'true'`. This container always runs with
// NODE_ENV=production (compose.yaml), so that alone would prevent it there —
// but confirmed live this script self-inflicts a false positive without this
// env var when run any other way (a local check against a real migrate-only
// database still triggered a push, planting the very batch=-1 marker this
// script exists to detect, since the ad hoc invocation didn't have
// NODE_ENV=production set). PAYLOAD_MIGRATING is the more precise, correct
// signal regardless of NODE_ENV — this script IS conceptually part of the
// migration process. Static `import`s are hoisted and evaluate before any
// subsequent statement in an ESM module, so this has to be a dynamic
// `import()` after setting the env var, not a plain top-of-file assignment
// below a static import line.
// Type-only import — erased at compile time, no runtime evaluation, so it
// can't trigger the push this file otherwise has to defer past the env var
// below. Kept as a real top-level import (rather than folded into an inline
// `import('...').Foo` type expression) purely so this file is unambiguously
// an ES module in TypeScript's eyes — with zero top-level import/export
// syntax at all, tsc treated this file's top-level `main` as colliding with
// another sibling script's own `main` in the same global scope.
import type { PostgresAdapter } from '@payloadcms/db-postgres'

process.env.PAYLOAD_MIGRATING = 'true'

async function main() {
  const { getPayload } = await import('payload')
  const config = (await import('@payload-config')).default
  const payload = await getPayload({ config })

  // Same public payload.db.execute({ raw }) method @payloadcms/drizzle's own
  // migrationTableExists()/migrate() use internally — not reaching into an
  // unexported path, this is a real, typed adapter method. Cast for the same
  // reason lib/rental/availability.ts's lockProductForBooking() does:
  // payload.db's own declared type doesn't carry PostgresAdapter's fields
  // (drizzle, execute's real signature) through automatically.
  const adapter = payload.db as unknown as PostgresAdapter

  const tableCheck = await adapter.execute({ drizzle: adapter.drizzle, raw: `SELECT to_regclass('"payload_migrations"') AS exists;` })
  const tableExists = Boolean((tableCheck.rows as { exists: unknown }[])[0]?.exists)
  if (!tableExists) {
    payload.logger.info('check-migration-drift: no payload_migrations table yet — fresh database, nothing to check.')
    process.exit(0)
  }

  const driftCheck = await adapter.execute({ drizzle: adapter.drizzle, raw: `SELECT count(*) AS count FROM "payload_migrations" WHERE batch = -1;` })
  const driftCount = Number((driftCheck.rows as { count: string }[])[0]?.count ?? 0)

  if (driftCount > 0) {
    payload.logger.error(
      "check-migration-drift: this database has a dev-mode (push:true) schema-push marker (payload_migrations.batch = -1). " +
        "`payload migrate` would hang forever here waiting for an interactive confirmation prompt this container's stdin can " +
        'never answer — failing fast instead. This means a `pnpm dev`/push-mode process was pointed at this database at some ' +
        'point (often a stale Docker volume reused from earlier testing, see docs/audits/2026-08-24-baseline.md DEPLOY-001). ' +
        'Resolve manually: either accept the drift and run `payload migrate` yourself with a real interactive TTY attached ' +
        '(`docker compose run --rm cms sh` or similar), or discard this database/volume if it was only ever meant for testing.',
    )
    process.exit(1)
  }

  payload.logger.info('check-migration-drift: clean, no dev-mode push marker found.')
  process.exit(0)
}

main().catch((err) => {
  // Only reachable if getPayload() itself fails (bad DB connection, bad
  // config) — genuinely can't check, so fail the same way an unreachable DB
  // would fail `payload migrate` itself anyway.
  console.error('check-migration-drift: failed to even connect —', err)
  process.exit(1)
})
