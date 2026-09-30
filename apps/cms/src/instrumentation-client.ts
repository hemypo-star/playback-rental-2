import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
  })
}
