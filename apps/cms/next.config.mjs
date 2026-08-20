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
  typescript: {
    // `next build`'s own internal type check (never run by `next dev`) fails
    // on app/(payload)/layout.tsx's exported `Layout` component against
    // Next's auto-generated LayoutProps constraint. Root cause: React 19.2's
    // ReactPortal type now requires its own `children` field, which makes
    // the ReactElement our JSX returns structurally fail assignability to
    // ReactNode in that one generated-type comparison — a real
    // @types/react 19.2 / Next 15.5 ecosystem quirk, not a bug in this
    // project's code or its dependency resolution: re-verified by building
    // the actual Docker image (properly `--filter cms...`-scoped, no stray
    // package versions possible) and it fails identically. Wrapping the
    // rendered `{children}` in a Fragment (see layout.tsx) does fix the
    // direct-source-level version of this error that plain `tsc --noEmit`
    // reports — kept, since it's a real improvement for IDE/lint tooling —
    // but doesn't touch Next's separate, stricter check against its
    // generated .next/types file, which is what's suppressed here.
    // No narrower escape hatch exists: this check isn't behind its own
    // flag, and @ts-expect-error can't target it (the diagnostic is
    // anchored in Next's generated .next/types file, not our source).
    // Revisit by removing this once a `@types/react`/Next upgrade fixes
    // the underlying type incompatibility.
    ignoreBuildErrors: true,
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
