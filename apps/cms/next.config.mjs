import { withPayload } from '@payloadcms/next/withPayload'

// Before docs/PLAN-next-migration.md Stage 1, apps/web reverse-proxied this
// app so admin and site shared one public origin — every admin form
// submission arrived here with Origin/Host rewritten to the storefront's,
// not this app's own, and Next's Server Actions reject that mismatch by
// default ("Invalid Server Actions request"). As of Stage 1 this app is the
// public entry point itself (see src/proxy.ts) and /cms is never proxied
// into, so the mismatch that originally motivated this can't happen for
// /cms anymore — kept anyway (not a Stage 1 line item; Stage 4's own
// cleanup list is where this is meant to go, once apps/web and every
// dual-origin possibility are actually gone, not just currently unused) in
// case a production reverse proxy/load balancer in front of this container
// (outside this repo's compose stack) does similar rewriting. WEB_URL is
// the same env var payload.config.ts already uses for cors/csrf.
const webUrl = process.env.WEB_URL || 'http://localhost:4322'
const allowedOrigin = new URL(webUrl).host

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16's auto-generated agent-rules files (AGENTS.md/CLAUDE.md) would
  // otherwise get written into apps/cms on every `next dev` — this project
  // already has its own root CLAUDE.md convention (see repo root); a second,
  // Next-authored one inside apps/cms would only conflict with it.
  agentRules: false,
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
