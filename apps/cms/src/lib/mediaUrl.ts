import type { Media } from '../payload-types'

export type MediaSize = 'thumbnail' | 'card' | 'large'

// Ported from apps/web/src/lib/payload.ts's mediaUrl() (docs/PLAN-next-
// migration.md Stage 2). The REST version received `{ url: string } |
// number`, since a shallow (depth:0) REST response leaves relations as a
// bare id; the Local API equivalent is `Media | number`, same idea. Payload
// media URLs are already browser-relative (/api/media/file/...), served
// natively by this app's own (payload) route group — no origin to resolve
// here, unlike apps/web's old CMS_INTERNAL_URL/PUBLIC_PAYLOAD_URL split.
//
// Backlog item 9: callers rendering a known visual slot can request a
// pre-generated Payload source so Next/Image does not have to pull the
// original upload into a cold optimizer cache first. Existing media that
// predates a size remains safe: Payload leaves that size absent until it is
// regenerated, and we deliberately fall back to the original URL.
export function mediaUrl(
  media: Media | number | null | undefined,
  size?: MediaSize,
): string | undefined {
  if (!media || typeof media === 'number') return undefined

  if (size) {
    const sizedUrl = media.sizes?.[size]?.url
    if (sizedUrl) return sizedUrl
  }

  return media.url ?? undefined
}
