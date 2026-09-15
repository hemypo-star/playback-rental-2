import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Categories } from './collections/Categories'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { OrderItems } from './collections/OrderItems'
import { Promotions } from './collections/Promotions'
import { SiteSettings } from './globals/SiteSettings'
import { moyskladWebhookEndpoint } from './endpoints/moyskladWebhook'
import { rentalAvailabilityEndpoint } from './endpoints/rentalAvailability'
import { rentalAvailabilityBulkEndpoint } from './endpoints/rentalAvailabilityBulk'
import { contactNotificationEndpoint } from './endpoints/contactNotification'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Payload silently accepts '' as a valid JWT signing secret — it doesn't
// validate this itself. An empty/predictable secret lets anyone forge a
// valid admin session token, so a missing env var must fail startup loudly,
// not fall back to something that "works" but isn't actually secure.
// (compose.yaml already guards this for Docker via `:?`; this covers any
// non-Docker invocation — e.g. `pnpm dev` — that skips that guard.)
if (!process.env.PAYLOAD_SECRET) {
  throw new Error('PAYLOAD_SECRET is not set (see apps/cms/.env.example) — refusing to start with an insecure default')
}

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      afterNavLinks: [
        '/src/components/admin/CalendarNavLink#CalendarNavLink',
        '/src/components/admin/ClientsNavLink#ClientsNavLink',
        '/src/components/admin/AnalyticsNavLink#AnalyticsNavLink',
      ],
      beforeDashboard: ['/src/components/admin/AdminKpiWidget#AdminKpiWidget'],
      views: {
        calendar: {
          Component: '/src/components/admin/CalendarView#CalendarView',
          path: '/calendar',
        },
        clients: {
          Component: '/src/components/admin/ClientsView#ClientsView',
          path: '/clients',
        },
        analytics: {
          Component: '/src/components/admin/AnalyticsView#AnalyticsView',
          path: '/analytics',
        },
      },
    },
  },
  // Payload's own admin UI moves to /cms — it stays reachable as a fallback/
  // safety net alongside the custom admin UI at /admin (this same app's own
  // (admin) route group, see docs/PLAN-docker-admin.md and docs/PLAN-next-
  // migration.md Stage 3). Requires the app/(payload)/admin route folder to
  // be renamed to app/(payload)/cms to match, and importMap regenerated.
  // Retiring this fallback (docker-admin Step 8) is a live, not-yet-taken
  // decision — see docs/ROADMAP-2.0.md's open items.
  routes: {
    admin: '/cms',
  },
  collections: [Users, Media, Categories, Products, Orders, OrderItems, Promotions],
  globals: [SiteSettings],
  // WEB_URL is this app's OWN public origin (see apps/cms/.env.example —
  // named for consistency with the root .env.example/compose.yaml, not
  // because it's a different app's address; historically, pre docs/PLAN-
  // next-migration.md Stage 1, it really was apps/web's separate origin).
  // This is a real, deliberate CSRF defense, not migration-era leftover
  // config now that apps/web is gone (Stage 4) and every request to this
  // app is genuinely same-origin within the compose stack: kept in case a
  // reverse proxy/load balancer/CDN in front of this container rewrites
  // Origin/Host. The mechanism worth remembering — Payload's cookie-JWT
  // strategy checks the request's own Origin (falling back to Sec-Fetch-
  // Site only when Origin is absent) against this allowlist even for
  // same-origin requests, and a Next Server Action's own POST does send an
  // Origin header, unlike a plain page navigation — a stale value here
  // silently fails auth on any Server Action that reads the session (this
  // exact bug hit the first Stage 3 Server Action that called
  // payload.auth(), see the 2026-08-20 dev log entry).
  cors: [process.env.WEB_URL || 'http://localhost:3000'],
  csrf: [process.env.WEB_URL || 'http://localhost:3000'],
  endpoints: [moyskladWebhookEndpoint, rentalAvailabilityEndpoint, rentalAvailabilityBulkEndpoint, contactNotificationEndpoint],
  editor: lexicalEditor(),
  // Guaranteed set — see the throw above.
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    // Every local `pnpm dev` startup (any non-production run without
    // PAYLOAD_MIGRATING=true) runs drizzle-kit's dev-mode schema push
    // (@payloadcms/db-postgres's connect.js -> @payloadcms/drizzle's
    // pushDevSchema), which introspects the *whole* database and diffs it
    // against Payload's Drizzle-generated schema — dropping any table that
    // isn't part of a Payload collection/global. `rate_limit_hits`
    // (migrations 20260910_120000_rate_limit_hits /
    // 20260910_130000_rate_limit_hits_prune_idx, backing
    // lib/security/rateLimit.ts) is exactly such a table: hand-authored,
    // never declared as a collection, so it's invisible to the push's
    // "desired" schema and gets silently DROPped from the "actual" one —
    // taking down checkout/contact/admin-login rate limiting with it, and
    // (once payload_migrations' dev-push batch=-1 sentinel is planted) also
    // causing the DEPLOY-001 hang check-migration-drift.ts documents.
    // `tablesFilter` is passed straight through to drizzle-kit's
    // `pushSchema` (@payloadcms/drizzle's pushDevSchema.js), which builds
    // one `Minimatch` glob matcher per entry and applies it while
    // *introspecting* the database — a table that doesn't match is treated
    // as though it doesn't exist in the DB at all, so the diff never
    // generates a DROP for it (verified against the installed
    // drizzle-kit@0.31.7 by reading pgPushIntrospect's filter logic and the
    // resolved minimatch@3.1.5's actual negate semantics: `'!x'` matches
    // every table name except `x`). This does NOT disable the push or its
    // usefulness for real Payload tables — only this bare exclusion list
    // must be kept in sync by hand: if you add another non-Payload table
    // the same way rate_limit_hits was added, add its name here too (and
    // say so in that migration's own comment, the way the two migrations
    // above do). Do not delete this thinking it's redundant with
    // migrations/`payload migrate` — this filter is what stops *push mode*
    // specifically from dropping tables migrate itself would never touch.
    //
    // Gotcha for the next table added here (confirmed live while fixing
    // this): filtering a table out of the push stops its columns/indexes
    // from being diffed, but a `serial`/`GENERATED ... AS IDENTITY` column
    // still owns a separate Postgres sequence object that drizzle-kit's
    // introspection lists *unconditionally* (never consulting
    // `tablesFilter`) and only ever "claims" (removes from its drop
    // candidates) by visiting the owning column — which a filtered-out
    // table never gets. The result is the sequence gets scheduled for
    // `DROP SEQUENCE` anyway, which then hard-fails the push (and crashes
    // `next dev`) once the filter is protecting the table it belongs to.
    // `rate_limit_hits` sidesteps this entirely by not owning one — see
    // migration 20260911_090000_rate_limit_hits_uuid_pk, which moved its
    // `id` off a `serial` sequence onto a plain `uuid default
    // gen_random_uuid()`. Give any future excluded table the same
    // treatment (no owned sequence) rather than rediscovering this.
    tablesFilter: ['!rate_limit_hits'],
  }),
})
