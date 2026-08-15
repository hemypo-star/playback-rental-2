// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  // Server output: catalog/product/checkout pages need live inventory and
  // availability from Payload on every request, not just at build time.
  // Standalone Node adapter matches the plan's self-hosted VPS + PM2 deploy
  // (same shape as apps/cms, not a managed-hosting move).
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // The repo root is itself a workspace package (a legacy Vite/React app —
    // see CLAUDE.md), pinned to a different React major. An unscoped
    // `pnpm install` at the repo root (rather than `--filter web...`, which
    // is what the Docker build actually uses) leaves both copies resolvable
    // from this app's dependency tree; Vite's dev-dependency pre-bundler can
    // then optimize against the wrong one, breaking every client:* island
    // with a cryptic `_jsxDEV is not a function` at hydration time.
    // Forcing dedupe makes local (non-Docker) dev robust to that even though
    // it isn't the supported workflow.
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
  },
});