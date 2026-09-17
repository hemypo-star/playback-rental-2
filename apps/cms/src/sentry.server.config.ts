import * as Sentry from '@sentry/nextjs'

const dsn = process.env.GLITCHTIP_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.GLITCHTIP_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  })
}
