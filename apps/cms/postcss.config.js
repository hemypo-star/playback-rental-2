// Shadows the old app's root postcss.config.js — postcss-load-config walks up
// the tree and would otherwise pick that one up, running its v3-era Tailwind
// plugin (content globs pointing at the legacy app's own pages/components,
// matching nothing here) against every CSS/SCSS Next.js compiles for this
// app, including Payload's own admin styles. That's the actual cause of the
// unstyled /cms admin panel (Tailwind logs "content option is missing or
// empty" — see next dev output) — nothing to do with the storefront proxy.
// apps/web already has the same shadow file for the same reason.
export default {
  plugins: {},
}
