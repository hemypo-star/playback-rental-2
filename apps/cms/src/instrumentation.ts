import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Next.js calls this hook for uncaught request/render failures in the server
// runtimes. The SDK is intentionally a no-op when GLITCHTIP_DSN is unset,
// so local/dev environments do not need a monitoring service to boot.
export const onRequestError = Sentry.captureRequestError
