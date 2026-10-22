import * as SentryNamespace from '@sentry/nextjs'

// Error reporting for the long-running scripts (reconcile and similar), which
// run under tsx rather than Next's bundler. There, @sentry/nextjs's CommonJS
// build only puts part of its API on the ESM namespace: `init` is there, but
// `captureException` and `flush` exist only on `default`. Calling
// `Sentry.captureException` directly threw a TypeError inside the daemon's
// own catch block, which turned every failed МойСклад sync into a crash and a
// restart loop. Reporting must never take the process down, so every call is
// also wrapped.
type SentryApi = Pick<typeof SentryNamespace, 'captureException' | 'flush'>

function sentryApi(): Partial<SentryApi> {
  const ns = SentryNamespace as Partial<SentryApi> & { default?: Partial<SentryApi> }
  return typeof ns.captureException === 'function' ? ns : (ns.default ?? {})
}

export function captureError(err: unknown, tags: Record<string, string>): void {
  try {
    sentryApi().captureException?.(err, { tags })
  } catch {
    // Monitoring is best-effort; the caller logs the error itself.
  }
}

export async function flushErrors(timeoutMs = 2_000): Promise<void> {
  try {
    await sentryApi().flush?.(timeoutMs)
  } catch {
    // Same as above.
  }
}
