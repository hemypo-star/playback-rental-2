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
// Fallback was 'http://localhost:4322' (apps/web's old port, pre-Next.js-
// migration) until 2026-08-24 — stale since Stage 4 (2026-08-21) made this
// app the single public entry point on 3000; only ever mattered if WEB_URL
// were genuinely unset, but every other fallback in the codebase
// (.env.example, payload.config.ts) already used 3000. SEC-004,
// docs/audits/2026-08-24-baseline.md.
const webUrl = process.env.WEB_URL || 'http://localhost:3000'
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
  //
  // SEC-002 (docs/audits/2026-08-24-baseline.md): confirmed live via
  // `curl -sD -` that no security response headers were set anywhere in
  // this app. SAMEORIGIN rather than DENY on X-Frame-Options — nothing in
  // this app currently relies on being iframed cross-origin, but Payload's
  // own admin UI (/cms) may use same-origin iframes internally for some
  // panels, so SAMEORIGIN is the safer default that still blocks the actual
  // threat (third-party clickjacking) without risking breaking that.
  // Strict-Transport-Security is a no-op over plain HTTP (browsers ignore
  // it unless the response was actually served over HTTPS) — harmless to
  // set now, and it's the header a reverse proxy/CDN terminating real TLS
  // in front of this container would need forwarded through anyway.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
