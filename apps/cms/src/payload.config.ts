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
import { adminKpiEndpoint } from './endpoints/admin/kpi'
import { adminCalendarEndpoint } from './endpoints/admin/calendar'
import { adminClientsEndpoint } from './endpoints/admin/clients'
import { adminAnalyticsEndpoint } from './endpoints/admin/analytics'
import { adminOrdersEndpoint } from './endpoints/admin/orders'
import { adminOrderDetailEndpoint } from './endpoints/admin/orderDetail'
import { adminStockEndpoint } from './endpoints/admin/stock'

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
  endpoints: [
    moyskladWebhookEndpoint,
    rentalAvailabilityEndpoint,
    rentalAvailabilityBulkEndpoint,
    contactNotificationEndpoint,
    adminKpiEndpoint,
    adminCalendarEndpoint,
    adminClientsEndpoint,
    adminAnalyticsEndpoint,
    adminOrdersEndpoint,
    adminOrderDetailEndpoint,
    adminStockEndpoint,
  ],
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
  }),
})
