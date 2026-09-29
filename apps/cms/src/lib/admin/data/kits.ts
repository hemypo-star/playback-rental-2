import type { Payload } from 'payload'
import type { Category, Media } from '../../../payload-types'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getAdminUser } from '../auth'

// Read helpers for the /admin/kits pages (kit = a product with isKit:true,
// assembled from already-synced МойСклад items — see kits/actions.ts).
// Kept in lib/admin/data like the other admin data modules so the pages
// stay thin server components.

export interface AdminKitRow {
  id: number
  title: string
  category: string | null
  quantity: number
  price: number
  oldPrice: number | null
  available: boolean
  componentCount: number
}

export async function getAdminKits(): Promise<AdminKitRow[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    where: { isKit: { equals: true } },
    sort: 'title',
    limit: 0,
    depth: 1,
  })
  return result.docs.map((p) => ({
    id: p.id,
    title: p.title,
    category: typeof p.category === 'object' && p.category ? (p.category as Category).name : null,
    quantity: p.quantity,
    price: p.price,
    oldPrice: p.oldPrice ?? null,
    available: Boolean(p.available),
    componentCount: (p.kitItems ?? []).length,
  }))
}

export interface KitComponentOption {
  id: number
  title: string
  listingType: string
  price: number
}

// Components of a kit are ordinary МойСклад-synced products (a kit of kits
// would make stock math ambiguous, so isKit rows are excluded here).
export async function getKitComponentOptions(): Promise<KitComponentOption[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'products',
    where: { isKit: { not_equals: true } },
    sort: 'title',
    limit: 0,
    depth: 0,
    select: { title: true, listingType: true, price: true },
  })
  return result.docs.map((p) => ({
    id: p.id,
    title: p.title,
    listingType: String(p.listingType ?? ''),
    price: Number(p.price ?? 0),
  }))
}

export interface KitEditData {
  id: number
  title: string
  description: string
  subtitle: string
  tag: string
  price: number
  oldPrice: number | null
  quantity: number
  available: boolean
  images: { id: number; url: string }[]
  category: number | null
  componentIds: number[]
}

export async function getKitById(id: number): Promise<KitEditData | null> {
  const payload = await getPayload({ config })
  const doc = await payload.findByID({ collection: 'products', id, depth: 1, disableErrors: true })
  if (!doc || !doc.isKit) return null
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description ?? '',
    subtitle: doc.subtitle ?? '',
    tag: doc.tag ?? '',
    price: doc.price,
    oldPrice: doc.oldPrice ?? null,
    quantity: doc.quantity,
    available: Boolean(doc.available),
    images: (doc.images ?? [])
      .filter((img): img is Media => typeof img === 'object' && img !== null)
      .map((img) => ({ id: img.id, url: img.url ?? '' })),
    category: typeof doc.category === 'object' && doc.category ? (doc.category as Category).id : null,
    componentIds: (doc.kitItems ?? []).map((item) => Number(item.id)).filter(Number.isFinite),
  }
}

// Server-side image upload for the kit form. This runs in a plain async
// function (NOT a React Server Action): RSC actions serialize FormData into
// an internal blob store and can fail with 500 / "Minified React error #440"
// when the payload is large. The route handler below receives a regular
// multipart POST from the client instead. Binary handling mirrors the sync
// job's media import (payload.create with `file: { data, ... }`).
export async function uploadKitImageFromFile(file: File): Promise<{ id: number; url: string }> {
  const payload: Payload = await getPayload({ config })
  const buf = Buffer.from(await file.arrayBuffer())
  const doc = await payload.create({
    collection: 'media',
    data: { alt: file.name.replace(/\.[^.]+$/, '') },
    // Payload 3 upload API: binary goes through `file`, not a data field
    // (same shape as the sync job's media import in lib/moysklad/sync.ts).
    file: { data: buf, mimetype: file.type || 'image/jpeg', name: file.name, size: file.size },
    overrideAccess: true,
  })
  return { id: doc.id, url: doc.url ?? '' }
}

export interface KitUploadResult {
  success: boolean
  id?: number
  url?: string
  error?: string
}

// Handler for POST /admin/kits/upload (multipart field "file"). Auth via
// the same admin session cookie the server actions use. Upload happens in a
// route handler rather than a Server Action because RSC actions serialize
// FormData through an internal blob store, which 500s on large images
// (React error #418/#441 in the browser).
export async function handleKitImageUpload(req: Request): Promise<KitUploadResult> {
  const user = await getAdminUser()
  if (!user) return { success: false, error: 'Не авторизованы' }
  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { success: false, error: 'Файл не получен' }
  try {
    const uploaded = await uploadKitImageFromFile(file)
    return { success: true, id: uploaded.id, url: uploaded.url }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Не удалось загрузить фото' }
  }
}
