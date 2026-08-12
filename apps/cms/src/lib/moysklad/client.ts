// Thin client for МойСклад's JSON API 1.2 (https://dev.moysklad.ru/doc/api/remap/1.2/).
// Auth confirmed working in Phase 0 (project plan) via a Bearer personal access token.

const BASE_URL = 'https://api.moysklad.ru/api/remap/1.2'

function getToken(): string {
  const token = process.env.MOYSKLAD_API_TOKEN
  if (!token) {
    throw new Error('MOYSKLAD_API_TOKEN is not set (see apps/cms/.env.example)')
  }
  return token
}

export async function msGet<T = any>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Accept-Encoding': 'gzip',
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`МойСклад API error ${res.status} on ${path}: ${body}`)
  }
  return res.json() as Promise<T>
}

export async function msGetBinary(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  })
  if (!res.ok) {
    throw new Error(`МойСклад image download failed ${res.status} on ${url}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export interface MsListResponse<T> {
  meta: { size: number; limit: number; offset: number; nextHref?: string }
  rows: T[]
}

// Paginates through a МойСклад list endpoint, yielding all rows.
export async function* msPaginate<T = any>(
  path: string,
  pageSize = 100,
): AsyncGenerator<T[], void, unknown> {
  let offset = 0
  const separator = path.includes('?') ? '&' : '?'
  for (;;) {
    const page = await msGet<MsListResponse<T>>(
      `${path}${separator}limit=${pageSize}&offset=${offset}`,
    )
    yield page.rows
    offset += page.rows.length
    if (page.rows.length < pageSize || offset >= page.meta.size) break
  }
}
