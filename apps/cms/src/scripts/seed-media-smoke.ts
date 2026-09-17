import { getPayload } from 'payload'
import config from '@payload-config'

const FILE_NAME = 'smoke-admin-media.png'

// 1x1 opaque PNG, generated once and embedded so CI needs no external file.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

async function main() {
  const payload = await getPayload({ config })

  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: FILE_NAME } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs[0]) {
    console.log(JSON.stringify({ mediaId: existing.docs[0].id, filename: FILE_NAME, reused: true }))
    process.exit(0)
  }

  const data = Buffer.from(PNG_BASE64, 'base64')
  const media = await payload.create({
    collection: 'media',
    data: { alt: 'Smoke admin media original alt' },
    file: {
      data,
      mimetype: 'image/png',
      name: FILE_NAME,
      size: data.length,
    },
    overrideAccess: true,
  })

  console.log(JSON.stringify({ mediaId: media.id, filename: media.filename, reused: false }))
  process.exit(0)
}

main().catch((error) => {
  console.error('Smoke media fixture seed failed', error)
  process.exit(1)
})
