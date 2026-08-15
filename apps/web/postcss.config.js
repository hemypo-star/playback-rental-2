// Shadows the old app's root postcss.config.js (Vite's postcss-load-config
// walks up the tree and would otherwise pick that one up and run its v3-era
// `tailwindcss` plugin against this app's v4 CSS). @tailwindcss/vite handles
// Tailwind directly — no PostCSS plugin needed here.
export default {
  plugins: {},
}
