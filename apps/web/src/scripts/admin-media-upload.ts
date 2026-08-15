// Shared by every admin image field (Category.image, Promotion.image,
// Product.images) — one small POST helper rather than triplicating the
// same multipart upload in three pages' inline scripts.
export interface UploadedMedia {
  id: number
  url: string
}

export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/media', { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.errors?.[0]?.message || 'Не удалось загрузить файл')
  }
  const body = await res.json()
  return { id: body.doc.id, url: body.doc.url }
}
