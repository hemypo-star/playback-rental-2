// Browser error reporting (GlitchTip). NEXT_PUBLIC_GLITCHTIP_DSN is inlined at
// build time, so without a DSN this whole branch is dead code and the SDK is
// not shipped at all. It used to be a static `import * as Sentry`, which put
// the SDK (tens of KB gzip) into the shared bundle of every page even with no
// DSN. With a DSN it loads as its own chunk after the page starts; errors in
// the first moments of a page load are the price.
const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN

if (dsn) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: process.env.NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: 0,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      sendDefaultPii: false,
    })
  })
}
