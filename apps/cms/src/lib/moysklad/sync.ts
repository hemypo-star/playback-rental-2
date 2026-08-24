import type { Payload, RequiredDataFromCollectionSlug } from 'payload'
import { msGet, msGetBinary, msPaginate } from './client'
import {
  fetchAllFolders,
  resolveAccountingFolderIds,
  resolveRentalFolderIds,
  resolveSaleFolderIds,
  type MsFolder,
} from './folders'
import { slugify } from './slugify'

// Shapes for the МойСклад JSON API 1.2 entities this module actually reads
// fields from — not full API coverage, just what's used here.
interface MsHrefRef {
  meta?: { href?: string }
}

export interface MsImage {
  meta?: { href?: string }
  filename?: string
}

// /entity/product and /entity/service rows have the same fields this module
// cares about (name, price, folder, image/stock via the separate stock
// report) — one shape covers both Товар and Услуга here.
interface MsListing {
  id: string
  name: string
  description?: string
  code?: string
  externalCode?: string
  productFolder?: MsHrefRef
  salePrices?: { value?: number }[]
}

// A row from /report/stock/all.
interface MsStockRow {
  meta?: { href?: string }
  stock: number
  image?: MsImage
}

// Was cast `as string` — a malformed/empty href made .pop() return
// undefined, which the cast doesn't actually convert, just lies to the
// compiler about. Downstream that put the literal value `undefined` in as
// a Map key instead of failing loudly, so a bad row degraded to "silently
// unfindable later" rather than a visible error.
function extractIdFromHref(href: string): string | null {
  return href.split('?')[0].split('/').filter(Boolean).pop() ?? null
}

// МойСклад webhook hrefs look like .../entity/product/{id} or
// .../entity/service/{id} — pull out both the entity type and id.
export function parseEntityHref(href: string): { type: string; id: string } | null {
  const match = href.match(/\/entity\/([a-z]+)\/([0-9a-f-]+)/i)
  if (!match) return null
  return { type: match[1], id: match[2] }
}

const RENTAL_NAME_PREFIX = 'аренда '

function stripRentalPrefix(name: string): string {
  const trimmed = name.trim()
  return trimmed.toLowerCase().startsWith(RENTAL_NAME_PREFIX)
    ? trimmed.slice(RENTAL_NAME_PREFIX.length).trim()
    : trimmed
}

export type ListingType = 'rental' | 'sale'

export interface SyncOptions {
  // Caps how many listings are processed — used while building/verifying
  // the sync (a full run against ~2600 accounting products + ~215 rental
  // services + image downloads is slow and eats into МойСклад's rate limit;
  // raise/remove once this is proven out).
  limit?: number
}

export interface SyncResult {
  categories: { created: number; updated: number; failed: string[] }
  products: { created: number; updated: number; total: number; unmatchedInventory: string[]; failed: string[] }
}

async function upsertCategory(payload: Payload, folder: MsFolder): Promise<{ id: number; created: boolean }> {
  const existing = await payload.find({
    collection: 'categories',
    where: { moySkladFolderId: { equals: folder.id } },
    limit: 1,
  })

  if (existing.docs.length) {
    const doc = await payload.update({
      collection: 'categories',
      id: existing.docs[0].id,
      data: { name: folder.name },
    })
    return { id: doc.id as number, created: false }
  }

  let slug = slugify(folder.name) || folder.id.slice(0, 8)
  try {
    const doc = await payload.create({
      collection: 'categories',
      data: { name: folder.name, slug, moySkladFolderId: folder.id },
    })
    return { id: doc.id as number, created: true }
  } catch {
    // Slugs must be unique; fall back to a folder-id suffix on collision
    // (e.g. two same-named subfolders in different branches of the tree).
    slug = `${slug}-${folder.id.slice(0, 6)}`
    const doc = await payload.create({
      collection: 'categories',
      data: { name: folder.name, slug, moySkladFolderId: folder.id },
    })
    return { id: doc.id as number, created: true }
  }
}

/**
 * Syncs categories (МойСклад productfolders) under both the "Аренда
 * оборудования" and "На продажу" subtrees — per the owner, these are exactly
 * the categories that should appear on the storefront. Returns a map of
 * moySkladFolderId -> { payloadId, listingType }, used by syncProducts.
 */
export async function syncCategories(
  payload: Payload,
  allFolders: MsFolder[],
): Promise<{
  idMap: Map<string, { payloadId: number; listingType: ListingType }>
  created: number
  updated: number
  failed: string[]
}> {
  const rentalFolderIds = resolveRentalFolderIds(allFolders)
  const saleFolderIds = resolveSaleFolderIds(allFolders)

  const idMap = new Map<string, { payloadId: number; listingType: ListingType }>()
  let created = 0
  let updated = 0
  const failed: string[] = []

  for (const folder of allFolders) {
    const listingType: ListingType | null = rentalFolderIds.has(folder.id)
      ? 'rental'
      : saleFolderIds.has(folder.id)
        ? 'sale'
        : null
    if (!listingType) continue

    // One bad folder (a transient DB error, a slug collision retry that
    // still fails) must not abort every folder after it — a partial run
    // that skips one category is recoverable next sync; a run that silently
    // stops halfway through the folder list is not.
    try {
      const result = await upsertCategory(payload, folder)
      idMap.set(folder.id, { payloadId: result.id, listingType })
      if (result.created) created++
      else updated++
    } catch (err) {
      payload.logger.error({ err, folderId: folder.id, folderName: folder.name }, 'МойСклад sync: failed to upsert category, skipping')
      failed.push(folder.name)
    }
  }

  return { idMap, created, updated, failed }
}

async function uploadImageOnce(
  payload: Payload,
  image: MsImage | undefined,
  name: string,
): Promise<number | undefined> {
  const href = image?.meta?.href
  if (!href) return undefined

  // Images are re-imported by source href, so re-running the sync doesn't
  // re-download/re-upload images it already has.
  const existing = await payload.find({
    collection: 'media',
    where: { moySkladImageHref: { equals: href } },
    limit: 1,
  })
  if (existing.docs.length) return existing.docs[0].id as number

  const buffer = await msGetBinary(href)
  const filename = image?.filename || `${slugify(name) || 'item'}.jpg`

  const doc = await payload.create({
    collection: 'media',
    data: { alt: name, moySkladImageHref: href },
    file: { data: buffer, mimetype: 'image/jpeg', name: filename, size: buffer.length },
  })
  return doc.id as number
}

async function upsertProduct(payload: Payload, moySkladId: string, data: RequiredDataFromCollectionSlug<'products'>) {
  const existingDoc = await payload.find({
    collection: 'products',
    where: { moySkladId: { equals: moySkladId } },
    limit: 1,
  })
  if (existingDoc.docs.length) {
    await payload.update({ collection: 'products', id: existingDoc.docs[0].id, data })
    return 'updated' as const
  }
  await payload.create({ collection: 'products', data })
  return 'created' as const
}

/**
 * Syncs both listing types into Payload's `products` collection:
 *
 * - Rental listings come from /entity/service under "Аренда оборудования"
 *   (rentals are modeled as services in МойСклад — no ownership transfer).
 *   Services carry no stock, so quantity + image are sourced from the
 *   correspondingly-named Товар under "Оборудование (для учета)", matched
 *   case-insensitively after stripping the "Аренда " name prefix (validated
 *   at ~98% match rate against the real account in Phase 1).
 * - Sale listings come from /entity/product under "На продажу" directly
 *   (a real product sale — ownership does transfer), merged with
 *   /report/stock/all for quantity/image same as before.
 */
export async function syncProducts(
  payload: Payload,
  categoryIdMap: Map<string, { payloadId: number; listingType: ListingType }>,
  allFolders: MsFolder[],
  opts: SyncOptions = {},
): Promise<SyncResult['products']> {
  const accountingFolderIds = resolveAccountingFolderIds(allFolders)

  // Accounting-tree products, indexed by lowercased name — the correlation
  // key for rental services — and their stock/image via /report/stock/all,
  // indexed by product id.
  const accountingProductsByName = new Map<string, MsListing>()
  for await (const page of msPaginate<MsListing>('/entity/product')) {
    for (const p of page) {
      const folderId = p.productFolder?.meta?.href ? extractIdFromHref(p.productFolder.meta.href) : null
      if (folderId && accountingFolderIds.has(folderId)) {
        accountingProductsByName.set(p.name.trim().toLowerCase(), p)
      }
    }
  }

  const stockById = new Map<string, { stock: number; image?: MsImage }>()
  for await (const page of msPaginate<MsStockRow>('/report/stock/all')) {
    for (const row of page) {
      const id = row?.meta?.href ? extractIdFromHref(row.meta.href) : null
      if (id) stockById.set(id, { stock: row.stock, image: row.image })
    }
  }

  let created = 0
  let updated = 0
  let processed = 0
  const unmatchedInventory: string[] = []
  const failed: string[] = []

  // --- Rental listings (services) ---
  outerServices: for await (const page of msPaginate<MsListing>('/entity/service')) {
    for (const s of page) {
      const folderId = s.productFolder?.meta?.href ? extractIdFromHref(s.productFolder.meta.href) : null
      const categoryEntry = folderId ? categoryIdMap.get(folderId) : undefined
      if (!categoryEntry || categoryEntry.listingType !== 'rental') {
        continue
      }
      if (opts.limit && processed >= opts.limit) break outerServices

      // One bad listing (a malformed stock row, a transient DB error on
      // upsert) must not abort the rest of the run — everything before it
      // is already committed, and everything after it is otherwise lost
      // silently until the next full run.
      try {
        const inventoryProduct = accountingProductsByName.get(stripRentalPrefix(s.name).toLowerCase())
        const stock = inventoryProduct ? stockById.get(inventoryProduct.id) : undefined
        if (!inventoryProduct) unmatchedInventory.push(s.name)

        const priceKopecks = s.salePrices?.[0]?.value ?? 0
        const imageSource = stock?.image
        const mediaId = await uploadImageOnce(payload, imageSource, s.name)

        const data: RequiredDataFromCollectionSlug<'products'> = {
          title: s.name,
          listingType: 'rental',
          description: s.description || '',
          price: Math.round(priceKopecks) / 100,
          category: categoryEntry.payloadId,
          quantity: stock?.stock ?? 0,
          moySkladId: s.id,
          moySkladCode: s.code || s.externalCode || '',
          moySkladInventoryProductId: inventoryProduct?.id || null,
          lastSyncedAt: new Date().toISOString(),
        }
        if (mediaId) data.images = [mediaId]

        const result = await upsertProduct(payload, s.id, data)
        if (result === 'created') created++
        else updated++
      } catch (err) {
        payload.logger.error({ err, moySkladId: s.id, name: s.name }, 'МойСклад sync: failed to upsert rental listing, skipping')
        failed.push(s.name)
      }
      processed++
    }
  }

  // --- Sale listings (products) ---
  outerProducts: for await (const page of msPaginate<MsListing>('/entity/product')) {
    for (const p of page) {
      const folderId = p.productFolder?.meta?.href ? extractIdFromHref(p.productFolder.meta.href) : null
      const categoryEntry = folderId ? categoryIdMap.get(folderId) : undefined
      if (!categoryEntry || categoryEntry.listingType !== 'sale') {
        continue
      }
      if (opts.limit && processed >= opts.limit) break outerProducts

      try {
        const stock = stockById.get(p.id)
        const priceKopecks = p.salePrices?.[0]?.value ?? 0
        const mediaId = await uploadImageOnce(payload, stock?.image, p.name)

        const data: RequiredDataFromCollectionSlug<'products'> = {
          title: p.name,
          listingType: 'sale',
          description: p.description || '',
          price: Math.round(priceKopecks) / 100,
          category: categoryEntry.payloadId,
          quantity: stock?.stock ?? 0,
          moySkladId: p.id,
          moySkladCode: p.code || p.externalCode || '',
          lastSyncedAt: new Date().toISOString(),
        }
        if (mediaId) data.images = [mediaId]

        const result = await upsertProduct(payload, p.id, data)
        if (result === 'created') created++
        else updated++
      } catch (err) {
        payload.logger.error({ err, moySkladId: p.id, name: p.name }, 'МойСклад sync: failed to upsert sale listing, skipping')
        failed.push(p.name)
      }
      processed++
    }
  }

  return { created, updated, total: processed, unmatchedInventory, failed }
}

export async function syncAll(payload: Payload, opts: SyncOptions = {}): Promise<SyncResult> {
  const allFolders = await fetchAllFolders()
  const categories = await syncCategories(payload, allFolders)
  const products = await syncProducts(payload, categories.idMap, allFolders, opts)
  return {
    categories: { created: categories.created, updated: categories.updated, failed: categories.failed },
    products,
  }
}

async function buildStockLookup(): Promise<Map<string, { stock: number; image?: MsImage }>> {
  const stockById = new Map<string, { stock: number; image?: MsImage }>()
  for await (const page of msPaginate<MsStockRow>('/report/stock/all')) {
    for (const row of page) {
      const id = row?.meta?.href ? extractIdFromHref(row.meta.href) : null
      if (id) stockById.set(id, { stock: row.stock, image: row.image })
    }
  }
  return stockById
}

/**
 * Handles a МойСклад DELETE webhook event (SEC-006, docs/audits/
 * 2026-08-24-baseline.md — previously not handled at all: a deleted
 * МойСклад item stayed bookable in Payload indefinitely until the next full
 * `reconcile:moysklad` run, since that's the only other thing that would
 * notice it's gone). Marks the corresponding local product `available:
 * false` rather than deleting it — a real order may still reference it as a
 * line item, and `available` is already a synced field (not one of the
 * admin-only fields sync.ts's other upserts are careful never to touch), so
 * this is consistent with the rest of this module's partial-update
 * discipline, not a special case.
 *
 * Two ways a deletion maps onto a local product:
 * - Direct: the deleted entity's own id is a listing's `moySkladId` (a
 *   rental service, or a sale-tree product).
 * - Indirect: the deleted entity is a `product` in the accounting tree that
 *   backs a rental service's stock/image (see syncProducts' own docblock on
 *   the accounting-tree match) — found via `moySkladInventoryProductId`.
 *   The service listing itself wasn't deleted, but its physical stock item
 *   was, so it's no longer real inventory either.
 *
 * `productfolder` deletions aren't handled here — a deleted category
 * doesn't create a false-availability booking risk the way a deleted
 * product/service does, and category deletion has its own separate
 * questions (what happens to products still under it) out of scope for
 * this fix.
 */
export async function handleEntityDeleted(
  payload: Payload,
  entityType: string,
  entityId: string,
): Promise<{ handled: boolean; reason?: string }> {
  if (entityType !== 'service' && entityType !== 'product') {
    return { handled: false, reason: `DELETE not handled for entity type: ${entityType}` }
  }

  const direct = await payload.find({
    collection: 'products',
    where: { moySkladId: { equals: entityId } },
    limit: 1,
  })
  if (direct.docs.length) {
    await payload.update({ collection: 'products', id: direct.docs[0].id, data: { available: false } })
    return { handled: true }
  }

  if (entityType === 'product') {
    const viaInventory = await payload.find({
      collection: 'products',
      where: { moySkladInventoryProductId: { equals: entityId } },
      limit: 1,
    })
    if (viaInventory.docs.length) {
      await payload.update({ collection: 'products', id: viaInventory.docs[0].id, data: { available: false } })
      return { handled: true }
    }
  }

  return { handled: false, reason: 'No matching local product found (outside scope, or already gone)' }
}

/**
 * Resyncs a single МойСклад entity, for the webhook receiver — a targeted
 * version of syncProducts/syncCategories for one changed item instead of
 * the whole catalog. Reuses the exact same upsert helpers as the bulk sync
 * so the two paths can't drift apart (the class of bug this whole rewrite
 * was partly started to avoid).
 *
 * Folder/category resolution and (for services) the accounting-tree name
 * lookup are re-fetched each call rather than cached — correctness over
 * micro-optimization for Phase 1; individual webhook events are infrequent
 * enough that this is fast in practice (sub-second for the folder/category
 * pass, a few seconds for a service that needs the ~2600-product accounting
 * scan). Revisit if webhook volume ever makes that noticeable.
 */
export async function syncSingleEntity(
  payload: Payload,
  entityType: string,
  entityId: string,
): Promise<{ synced: boolean; reason?: string }> {
  const allFolders = await fetchAllFolders()
  const rentalFolderIds = resolveRentalFolderIds(allFolders)
  const saleFolderIds = resolveSaleFolderIds(allFolders)
  const accountingFolderIds = resolveAccountingFolderIds(allFolders)

  if (entityType === 'productfolder') {
    const folder = allFolders.find((f) => f.id === entityId)
    if (!folder) return { synced: false, reason: 'Folder not found (or no longer exists)' }
    const listingType: ListingType | null = rentalFolderIds.has(folder.id)
      ? 'rental'
      : saleFolderIds.has(folder.id)
        ? 'sale'
        : null
    if (!listingType) return { synced: false, reason: 'Folder is outside the rental/sale scope' }
    await upsertCategory(payload, folder)
    return { synced: true }
  }

  if (entityType === 'service') {
    const s = await msGet<MsListing>(`/entity/service/${entityId}`)
    const folderId = s.productFolder?.meta?.href ? extractIdFromHref(s.productFolder.meta.href) : null
    if (!folderId || !rentalFolderIds.has(folderId)) {
      return { synced: false, reason: 'Service is outside the rental folder scope' }
    }
    const categoryResult = await upsertCategory(
      payload,
      allFolders.find((f) => f.id === folderId)!,
    )

    const accountingProductsByName = new Map<string, MsListing>()
    for await (const page of msPaginate<MsListing>('/entity/product')) {
      for (const p of page) {
        const pFolderId = p.productFolder?.meta?.href ? extractIdFromHref(p.productFolder.meta.href) : null
        if (pFolderId && accountingFolderIds.has(pFolderId)) {
          accountingProductsByName.set(p.name.trim().toLowerCase(), p)
        }
      }
    }
    const inventoryProduct = accountingProductsByName.get(stripRentalPrefix(s.name).toLowerCase())
    const stockById = await buildStockLookup()
    const stock = inventoryProduct ? stockById.get(inventoryProduct.id) : undefined

    const priceKopecks = s.salePrices?.[0]?.value ?? 0
    const mediaId = await uploadImageOnce(payload, stock?.image, s.name)

    const data: RequiredDataFromCollectionSlug<'products'> = {
      title: s.name,
      listingType: 'rental',
      description: s.description || '',
      price: Math.round(priceKopecks) / 100,
      category: categoryResult.id,
      quantity: stock?.stock ?? 0,
      moySkladId: s.id,
      moySkladCode: s.code || s.externalCode || '',
      moySkladInventoryProductId: inventoryProduct?.id || null,
      lastSyncedAt: new Date().toISOString(),
    }
    if (mediaId) data.images = [mediaId]
    await upsertProduct(payload, s.id, data)
    return { synced: true }
  }

  if (entityType === 'product') {
    const p = await msGet<MsListing>(`/entity/product/${entityId}`)
    const folderId = p.productFolder?.meta?.href ? extractIdFromHref(p.productFolder.meta.href) : null

    if (folderId && saleFolderIds.has(folderId)) {
      const categoryResult = await upsertCategory(
        payload,
        allFolders.find((f) => f.id === folderId)!,
      )
      const stockById = await buildStockLookup()
      const stock = stockById.get(p.id)
      const priceKopecks = p.salePrices?.[0]?.value ?? 0
      const mediaId = await uploadImageOnce(payload, stock?.image, p.name)

      const data: RequiredDataFromCollectionSlug<'products'> = {
        title: p.name,
        listingType: 'sale',
        description: p.description || '',
        price: Math.round(priceKopecks) / 100,
        category: categoryResult.id,
        quantity: stock?.stock ?? 0,
        moySkladId: p.id,
        moySkladCode: p.code || p.externalCode || '',
        lastSyncedAt: new Date().toISOString(),
      }
      if (mediaId) data.images = [mediaId]
      await upsertProduct(payload, p.id, data)
      return { synced: true }
    }

    if (folderId && accountingFolderIds.has(folderId)) {
      // This is the physical-inventory side (name, stock, image) for a
      // rental listing — find the matching Аренда-prefixed service and
      // resync it, so a stock/photo change here propagates to the listing
      // that's actually shown on the storefront.
      const matchName = `аренда ${p.name.trim()}`.toLowerCase()
      let matchedService: MsListing | null = null
      for await (const page of msPaginate<MsListing>('/entity/service')) {
        matchedService = page.find((s) => s.name.trim().toLowerCase() === matchName) ?? null
        if (matchedService) break
      }
      if (!matchedService) {
        return { synced: false, reason: 'No matching "Аренда " service found for this inventory item' }
      }
      return syncSingleEntity(payload, 'service', matchedService.id)
    }

    return { synced: false, reason: 'Product is outside the rental/sale/accounting scope' }
  }

  return { synced: false, reason: `Unhandled entity type: ${entityType}` }
}
