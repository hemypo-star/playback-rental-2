import { access } from 'node:fs/promises'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '@payload-config'

// One-off maintenance command for backlog item 9.
//
// Adding imageSizes only guarantees variants for newly uploaded/re-uploaded
// files. Run this against the real persistent media volume after deployment
// (or any restored media volume) to backfill the `card` / `large` variants
// for existing documents. It is deliberately NOT wired into app startup,
// migrations or CI: regenerating a large media library is I/O-heavy and must
// be an explicit operator action.
async function main() {
  const payload = await getPayload({ config })
  const staticDir = path.resolve(process.env.MEDIA_STATIC_DIR || 'media')

  const result = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 0,
    overrideAccess: true,
  })

  console.log(`Regenerating image sizes for ${result.totalDocs} media document(s) from ${staticDir}`)

  let regenerated = 0
  let skipped = 0
  let failed = 0

  for (const media of result.docs) {
    if (!media.filename || !media.mimeType?.startsWith('image/')) {
      skipped += 1
      continue
    }

    const filePath = path.join(staticDir, media.filename)

    try {
      await access(filePath)
      await payload.update({
        collection: 'media',
        id: media.id,
        data: {},
        filePath,
        overwriteExistingFiles: true,
        overrideAccess: true,
      })
      regenerated += 1
      console.log(`Regenerated media ${media.id}: ${media.filename}`)
    } catch (error) {
      failed += 1
      console.error(`Failed media ${media.id}: ${media.filename}`, error)
    }
  }

  console.log(`Media size regeneration complete: ${regenerated} regenerated, ${skipped} skipped, ${failed} failed`)

  if (failed > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error('Media size regeneration failed:', error)
  process.exit(1)
})
