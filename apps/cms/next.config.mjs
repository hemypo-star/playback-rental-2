import { withPayload } from '@payloadcms/next/withPayload'

// The storefront (apps/web) reverse-proxies this app so admin and site share
// one public origin (see apps/web/src/middleware.ts) — that means every
// admin form submission arrives here with Origin/Host rewritten to the
// storefront's, not this app's own. Next's Server Actions reject that
// mismatch by default ("Invalid Server Actions request"), so the
// storefront's public origin must be allow-listed explicitly. WEB_URL is the
// same env var payload.config.ts already uses for cors/csrf.
const webUrl = process.env.WEB_URL || 'http://localhost:4322'
const allowedOrigin = new URL(webUrl).host

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [allowedOrigin],
    },
  },
  // eslint.ignoreDuringBuilds used to be blanket-true here: `next dev` never
  // runs ESLint, so pre-existing `no-explicit-any` uses (~190, spread across
  // the admin dashboard components/endpoints and lib/rental/availability.ts)
  // went unnoticed until the first real `next build` started failing
  // outright. Rather than keep builds blind to lint everywhere, the
  // suppression is now scoped to just those legacy paths in
  // eslint.config.mjs (see `legacyAnyPaths`) — new code, including every
  // route group the Next.js migration adds, is linted at full strictness.
  // Retyping the legacy surface is separate follow-up work, not a blocker.
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
