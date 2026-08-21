// Shadows the legacy root app's own postcss.config.js — postcss-load-config
// walks up the tree and would otherwise pick that one up, running its
// v3-era Tailwind plugin (content globs pointing at the legacy app's own
// pages/components, matching nothing here) against every CSS/SCSS Next.js
// compiles for this app, including Payload's own admin styles. That was the
// actual cause of a long-standing unstyled /cms admin panel bug (Tailwind
// logged "content option is missing or empty" — see next dev output).
//
// @tailwindcss/postcss added in docs/PLAN-next-migration.md Stage 1, for
// src/styles/global.css (the (frontend) route group's stylesheet). It only
// activates for files that actually `@import "tailwindcss"` — Payload's own
// (payload)/custom.css has no Tailwind directives, so it passes through
// unaffected.
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

export default config
