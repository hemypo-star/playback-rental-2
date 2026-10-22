import type { Endpoint } from 'payload'
import type { PostgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

// Container healthcheck and uptime-monitor target: 200 only when the app can
// actually reach Postgres. The compose healthcheck used /api/access before,
// which answers 200 with the database down while every page 500s, so a
// broken stack stayed "healthy". Public and data-free.
const DB_TIMEOUT_MS = 3_000

export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    const adapter = req.payload.db as unknown as PostgresAdapter
    try {
      await Promise.race([
        adapter.drizzle.execute(sql`select 1`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('database timeout')), DB_TIMEOUT_MS)),
      ])
      return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return Response.json({ ok: false, error: 'database unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }
  },
}
