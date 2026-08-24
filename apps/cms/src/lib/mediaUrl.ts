import type { Media } from '../payload-types'

// Ported from apps/web/src/lib/payload.ts's mediaUrl() (docs/PLAN-next-
// migration.md Stage 2). The REST version received `{ url: string } |
// number`, since a shallow (depth:0) REST response leaves relations as a
// bare id; the Local API equivalent is `Media | number`, same idea. Payload
// media URLs are already browser-relative (/api/media/file/...), served
// natively by this app's own (payload) route group — no origin to resolve
// here, unlike apps/web's old CMS_INTERNAL_URL/PUBLIC_PAYLOAD_URL split.
export function mediaUrl(media: Media | number | null | undefined): string | undefined {
  if (!media || typeof media === 'number') return undefined
  return media.url ?? undefined
}
