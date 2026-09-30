import type { Metadata } from 'next'

// Centralizes canonical/OG/Twitter meta construction. Next's Metadata API
// does NOT deep-merge a page's `openGraph`/`twitter` object with the parent
// layout's — a page that sets `openGraph` at all fully replaces the
// layout's, and a page that sets none inherits the layout's generic
// default — so every page with real content needs its own explicit,
// title/description-matched openGraph/twitter, not just a `title` string.
// Ported from apps/web/src/layouts/Layout.astro's og:*/twitter:* block
// (pre-Next.js-migration `im9cfz` branch), adapted from Astro's single
// shared layout to Next's per-page metadata model.
export const SITE_NAME = 'Playback Rental'
const DEFAULT_DESCRIPTION = 'Прокат фото- и видеотехники в Кемерове.'

export function siteOrigin(): string {
  return process.env.WEB_URL || 'http://localhost:3000'
}

interface BuildMetadataParams {
  title: string
  description?: string
  /** Root-relative path, e.g. `/product/220` — becomes the canonical/og:url. */
  path: string
  /** Root-relative or absolute image URL. Omitted entirely (not defaulted to
   * a sitewide logo) when a page has nothing genuinely representative to
   * show — a generic image on every shared link is worse than none. */
  image?: string
}

// Next's typed `openGraph.type` only supports 'website' | 'article' | 'book'
// | 'profile' | music.*/video.* — there's no 'product' variant to opt into
// the way apps/web's old Layout.astro (untyped Astro props) could. The
// Product/Offer JSON-LD on the product page already carries the real
// "this is a rental/sale" semantics, so every page just uses 'website' here.
export function buildMetadata({ title, description = DEFAULT_DESCRIPTION, path, image }: BuildMetadataParams): Metadata {
  const origin = siteOrigin()
  const url = new URL(path, origin).toString()
  const absoluteImage = image ? new URL(image, origin).toString() : undefined

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE_NAME,
      type: 'website',
      title,
      description,
      url,
      locale: 'ru_RU',
      images: absoluteImage ? [{ url: absoluteImage }] : undefined,
    },
    twitter: {
      card: absoluteImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: absoluteImage ? [absoluteImage] : undefined,
    },
  }
}
