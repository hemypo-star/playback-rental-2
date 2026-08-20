// Shared TypeScript types between apps/cms (Payload) and apps/web (Astro).
// Mirrors the Payload collection shapes defined in apps/cms/src/collections and
// apps/cms/src/globals — kept as plain interfaces (not generated) so apps/web
// doesn't need a build-time dependency on apps/cms's payload-types.ts.

export interface Media {
  id: number
  url: string
  alt?: string | null
  width?: number | null
  height?: number | null
  sizes?: {
    thumbnail?: { url?: string | null } | null
  } | null
}

export interface Category {
  id: number
  name: string
  slug: string
  description?: string | null
  tag?: string | null
  image?: Media | number | null
  order: number
  parent?: Category | number | null
  moySkladFolderId?: string | null
}

export type ListingType = 'rental' | 'sale'

export interface KitItem {
  id?: string
  label: string
}

export interface Product {
  id: number
  title: string
  listingType: ListingType
  description?: string | null
  subtitle?: string | null
  tag?: string | null
  price: number
  images?: (Media | number)[] | null
  category: Category | number
  quantity: number
  available: boolean
  isKit?: boolean | null
  oldPrice?: number | null
  kitItems?: KitItem[] | null
  moySkladId: string
  lastSyncedAt?: string | null
}

export interface Promotion {
  id: number
  title: string
  slug?: string | null
  kicker?: string | null
  text?: string | null
  // Longer body for the standalone /promotions/:slug page — `text` above is
  // the short homepage-carousel blurb.
  content?: string | null
  image: Media | number
  linkUrl?: string | null
  linkedProducts?: (Product | number)[] | null
  linkedCategories?: (Category | number)[] | null
  active: boolean
  order: number
}

export interface HowItWorksStep {
  id?: string
  title: string
  text: string
}

export interface SiteSettings {
  heroBannerImage?: Media | number | null
  heroBannerImageMobile?: Media | number | null
  heroKicker?: string | null
  heroCity?: string | null
  heroHeadline?: string | null
  heroSubtext?: string | null
  depositLabel?: string | null
  depositCaption?: string | null
  pickupTimeLabel?: string | null
  pickupTimeCaption?: string | null
  howItWorksSteps?: HowItWorksStep[] | null
  ctaKicker?: string | null
  ctaHeadline?: string | null
  ctaSubtext?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  contactTelegram?: string | null
  contactTelegramUrl?: string | null
  contactVkUrl?: string | null
  contactAddress?: string | null
  contactHours?: string | null
  yandexMapsUrl?: string | null
  twoGisUrl?: string | null
}

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Order {
  id: number
  customerName: string
  customerEmail: string
  customerPhone: string
  status: OrderStatus
  totalPrice: number
  notes?: string | null
  moySkladOrderId?: string | null
  submittedAt?: string | null
  // Required by /:id/submit for anonymous checkout — proves the caller is the
  // client that created this order, not a third party enumerating ids.
  submitToken?: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: number
  order: Order | number
  product: Product | number
  listingType: ListingType
  quantity: number
  startDate?: string | null
  endDate?: string | null
  lineTotal: number
}

export interface PayloadFindResult<T> {
  docs: T[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface RentalAvailability {
  listingType: ListingType
  quantity: number
  available: number
  bookedRanges?: { startDate: string; endDate: string; quantity: number }[]
}
