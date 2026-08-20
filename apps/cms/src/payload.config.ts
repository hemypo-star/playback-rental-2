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
  // safety net while apps/web grows a custom admin UI at /admin (a separate,
  // unrelated set of Astro routes; see docs/PLAN-docker-admin.md). Requires
  // the app/(payload)/admin route folder to be renamed to app/(payload)/cms
  // to match, and importMap regenerated.
  routes: {
    admin: '/cms',
  },
  collections: [Users, Media, Categories, Products, Orders, OrderItems, Promotions],
  globals: [SiteSettings],
  // WEB_URL is this app's OWN public origin (see apps/cms/.env.example —
  // named for consistency with the root .env.example/compose.yaml, not
  // because it's a different app's address). Historically (pre docs/PLAN-
  // next-migration.md Stage 1) apps/web really was a separate origin
  // needing a credentialed cross-origin `fetch('/api/users/me', {
  // credentials: 'include' })` for the Navbar's "Панель управления" link —
  // that's gone now that this app is the single public entry point, but
  // `cors`/`csrf` still need the value: Payload's cookie-JWT strategy
  // checks the request's own Origin (or Sec-Fetch-Site as a fallback, only
  // reached when Origin is absent) against this allowlist even for
  // same-origin requests, and a Next Server Action's own POST does send an
  // Origin header — a stale value here silently fails auth on any Server
  // Action that reads the session (unlike CheckoutPage's submitCheckout()
  // in Stage 2, which is anonymous; this only surfaced once Stage 3 added
  // the first Server Action that calls payload.auth()).
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
