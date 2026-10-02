// ONE-OFF, TEMPORARY script — not part of the app, safe to delete after use.
// Merges legacy Supabase product data (images/description) into the
// MoySklad-synced Products collection, filling ONLY empty fields. Never
// touches price/quantity/category/title (those are sync-owned).
//
// Usage: npx tsx --env-file-if-exists=.env one-off-legacy-merge.mjs [--dry-run]
//
// Requires db-migration/products_rows.csv (exported from the old Supabase)
// to sit next to this script's run location (../db-migration from apps/cms).

import { getPayload } from 'payload'
import config from './src/payload.config.ts'
import { readFileSync } from 'node:fs'

const DRY_RUN = process.argv.includes('--dry-run')
const CSV_PATH = '/Users/a1234/Desktop/playback-rental/db-migration/products_rows.csv'

function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++ } else { inQuotes = false } }
      else field += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
      else if (c === '\r') {}
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  const header = rows[0]
  return rows.slice(1).filter(r => r.length === header.length).map(r => Object.fromEntries(header.map((h, idx) => [h, r[idx]])))
}

function norm(s) {
  return (s || '').trim().toLowerCase().replace(/^аренда\s+/i, '').replace(/\s+/g, ' ')
}

async function downloadImage(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const urlPath = new URL(url).pathname
  const ext = (urlPath.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || 'jpg').toLowerCase()
  return { buf, contentType, ext }
}

const oldProducts = parseCsv(readFileSync(CSV_PATH, 'utf8'))
const payload = await getPayload({ config })
const result = await payload.find({ collection: 'products', limit: 0, depth: 0 })
const newProducts = result.docs

const newByTitle = new Map()
for (const p of newProducts) {
  const key = norm(p.title)
  if (!newByTitle.has(key)) newByTitle.set(key, [])
  newByTitle.get(key).push(p)
}

let updatedDescription = 0, updatedImages = 0, skippedAlreadyFilled = 0, downloadFailed = 0, noMatch = 0
const failures = []

for (const old of oldProducts) {
  const key = norm(old.title)
  const candidates = newByTitle.get(key) || []
  if (candidates.length !== 1) { noMatch++; continue }
  const np = candidates[0]

  const needsDescription = !(np.description && np.description.trim()) && old.description && old.description.trim()
  const needsImage = !(Array.isArray(np.images) && np.images.length > 0) && old.imageurl && old.imageurl.trim()

  if (!needsDescription && !needsImage) { skippedAlreadyFilled++; continue }

  const updateData = {}
  if (needsDescription) updateData.description = old.description

  if (needsImage) {
    try {
      const { buf, contentType, ext } = await downloadImage(old.imageurl)
      if (!DRY_RUN) {
        const mediaDoc = await payload.create({
          collection: 'media',
          data: { alt: old.title },
          file: { data: buf, mimetype: contentType, name: `legacy-${np.id}.${ext}`, size: buf.length },
          overrideAccess: true,
        })
        updateData.images = [mediaDoc.id]
      }
      updatedImages++
    } catch (e) {
      downloadFailed++
      failures.push({ product: old.title, url: old.imageurl, error: e.message })
    }
  }

  if (needsDescription) updatedDescription++

  if (Object.keys(updateData).length > 0 && !DRY_RUN) {
    await payload.update({ collection: 'products', id: np.id, data: updateData, overrideAccess: true })
  }
}

console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Done.`)
console.log('description filled:', updatedDescription)
console.log('images filled:', updatedImages)
console.log('already had both fields filled, skipped:', skippedAlreadyFilled)
console.log('image download failed:', downloadFailed)
console.log('no title match:', noMatch)
if (failures.length) {
  console.log('--- failures ---')
  failures.forEach(f => console.log(' -', f.product, '|', f.url, '|', f.error))
}

process.exit(0)
