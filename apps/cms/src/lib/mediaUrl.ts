import type { Media } from '../payload-types'

export type MediaSize = 'thumbnail' | 'card' | 'large' | 'original'

// Ported from apps/web/src/lib/payload.ts's mediaUrl() (docs/PLAN-next-
// migration.md Stage 2). The REST version received `{ url: string } |
// number`, since a shallow (depth:0) REST response leaves relations as a
// bare id; the Local API equivalent is `Media | number`, same idea. Payload
// media URLs are already browser-relative (/api/media/file/...), served
// natively by this app's own (payload) route group — no origin to resolve
// here, unlike apps/web's old CMS_INTERNAL_URL/PUBLIC_PAYLOAD_URL split.
//
// Backlog item 9: default to the 1600px width-preserving source. That is
// large enough for every current hero/gallery slot (including high-density
// displays) while preventing Next/Image and ordinary <img> previews from
// fetching an unrestricted multi-megabyte original first. High-volume card
// grids explicitly request `card`; a caller that genuinely needs the source
// upload can opt into `original`. Existing media that predates a generated
// size remains safe because every sized lookup falls back to `media.url`.
export function mediaUrl(
  media: Media | number | null | undefined,
  size: MediaSize = 'large',
): string | undefined {
  if (!media || typeof media === 'number') return undefined

  if (size !== 'original') {
    const sizedUrl = media.sizes?.[size]?.url
    if (sizedUrl) return sizedUrl
  }

  return media.url ?? undefined
}
