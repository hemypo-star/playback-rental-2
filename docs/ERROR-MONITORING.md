# Error monitoring — GlitchTip

Wave 3 / backlog item 3 uses a self-hosted GlitchTip instance as the error store. GlitchTip is Sentry-protocol compatible, so the application uses the official `@sentry/nextjs` SDK rather than a GlitchTip-specific client.

## What the application captures

- uncaught Next.js server/request/render errors through `src/instrumentation.ts`;
- browser-side uncaught errors through `src/instrumentation-client.ts`;
- Edge-runtime errors through `src/sentry.edge.config.ts`;
- failures of the always-on МойСклад reconciliation daemon, including startup failures, with a `process=moysklad-reconcile` tag.

Performance traces and session replay are deliberately disabled (`0`) for this first pass. The roadmap item is error visibility before cutover, not full observability, and keeping those streams off avoids adding load/noise before there is a reason to tune them. `sendDefaultPii` is also disabled.

If the DSN is absent, monitoring is a no-op. Development and test environments therefore do not need GlitchTip to start.

## Self-host GlitchTip

Use GlitchTip's maintained Docker Compose sample rather than copying a second, stale infrastructure stack into this repository. The official installation guide currently requires PostgreSQL 14+ and recommends Docker Compose for a single-server install; Valkey/Redis 7+ is optional. Configure at least `SECRET_KEY`, email (or `consolemail://` while bootstrapping), and `GLITCHTIP_DOMAIN`, then put the service behind HTTPS before production use.

After the instance is running:

1. Create an organization and a JavaScript/Next.js project in GlitchTip.
2. Copy that project's DSN.
3. Set both `GLITCHTIP_DSN` and `NEXT_PUBLIC_GLITCHTIP_DSN` to that DSN. The browser DSN is intentionally public; it is an event-ingestion address, not an administrative credential.
4. Set `GLITCHTIP_ENVIRONMENT=production` and `NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT=production` (or another identical deployment label).
5. Rebuild the `cms` image after changing `NEXT_PUBLIC_*`: Next.js embeds public variables into the browser bundle at build time. `compose.yaml` passes them into the Docker build automatically.
6. Deploy, then generate one controlled server error and one controlled browser error and confirm both appear in GlitchTip before the `2.0` cutover.

Do not treat successful compilation as proof that monitoring works: the final acceptance criterion is a real event visible in the production GlitchTip project.

## Source maps

This first pass does not upload source maps to GlitchTip. Errors still include stack traces, but minified browser frames will be less readable. Source-map upload needs an authenticated build-time GlitchTip token and release convention; add that only when the deployment has a real GlitchTip instance and credentials rather than introducing a secret-shaped placeholder now.
