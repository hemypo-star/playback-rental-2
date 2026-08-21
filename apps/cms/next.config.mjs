import { withPayload } from '@payloadcms/next/withPayload'

// Next's Server Actions reject a POST whose Origin header doesn't match an
// allowed origin ("Invalid Server Actions request") — this app is a single
// same-origin deployment (docs/PLAN-next-migration.md Stage 4 folded the
// last separate process, apps/web, into this one), so in the compose stack
// itself there's never a genuine cross-origin Server Action call. Kept
// anyway as a real, deliberate CSRF defense: a production reverse proxy,
// load balancer, or CDN in front of this container (outside this repo's
// compose stack) can rewrite Origin/Host, and without this allowlist a
// rewritten Origin would either be silently accepted (no check at all) or
// break legitimate requests in confusing ways. WEB_URL is the same env var
// payload.config.ts uses for cors/csrf — one source of truth for "this
// deployment's real public origin."
const webUrl = process.env.WEB_URL || 'http://localhost:4322'
const allowedOrigin = new URL(webUrl).host

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 16 auto-writes agent-rules files (AGENTS.md/CLAUDE.md) into
  // apps/cms on every `next dev`/`next build`. This project already has its
  // own root CLAUDE.md convention (see repo root) — apps/cms's copy is
  // Next's own generated one (framework/route conventions, not project
  // architecture) and is gitignored so it never collides with the real one;
  // treat it as disposable, regenerated output, not something to hand-edit.
  agentRules: true,
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
