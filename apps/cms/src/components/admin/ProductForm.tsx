'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/products/
// [id].astro (docs/PLAN-next-migration.md Stage 3.4/3.5) — same fields,
// same save behavior. The Astro source manipulated the images/kit-items
// lists with raw DOM createElement/dataset calls (its own comment there
// explains why: not innerHTML string interpolation, to avoid a latent
// injection trap); here that's just React state arrays instead — same
// end behavior (add/reorder/remove), idiomatic for the framework rather
// than a DOM-diffing exercise.
import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Media, Product } from '../../payload-types'
import { mediaUrl } from '../../lib/mediaUrl'
import { uploadMedia } from '../../lib/admin/mediaUpload'
import { saveProduct } from '../../app/(admin)/admin/products/[id]/actions'

interface Props {
  product: Product
  categoryName: string
}

interface ImageItem {
  id: number
  url: string
}

export default function ProductForm({ product, categoryName }: Props) {
  const router = useRouter()
  const uid = useId()

  const [title, setTitle] = useState(product.title)
  const [description, setDescription] = useState(product.description ?? '')
  const [available, setAvailable] = useState(Boolean(product.available))
  const [subtitle, setSubtitle] = useState(product.subtitle ?? '')
  const [tag, setTag] = useState(product.tag ?? '')
  const [images, setImages] = useState<ImageItem[]>(
    (product.images ?? [])
      .filter((img): img is Media => typeof img === 'object')
      .map((img) => ({ id: img.id, url: mediaUrl(img) ?? '' })),
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const media = await uploadMedia(file)
      setImages((prev) => [...prev, { id: media.id, url: media.url }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
    }
  }

  const moveImage = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    // Only the storefront-editable fields are sent (see Products collection):
    // price/quantity/isKit/oldPrice/kitItems and MoySklad* are read-only here.
    const result = await saveProduct(product.id, {
      title: title.trim(),
      description,
      available,
      subtitle,
      tag,
      images: images.map((img) => img.id),
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Не удалось сохранить')
      return
    }
    router.push('/admin/stock')
  }

  return (
    <>
      {error && <p className="rounded-2xl bg-status-alert-bg px-4 py-3 text-[13px] text-status-alert">{error}</p>}

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Витрина</div>

            <label htmlFor={`${uid}-title`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Название</label>
            <input
              id={`${uid}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label htmlFor={`${uid}-description`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Описание</label>
            <textarea
              id={`${uid}-description`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <p className="mt-2 text-[11.5px] leading-snug text-subtle">
              Название и описание приходят из МойСклада — следующие правки в них будут перезаписаны следующим прогоном синхронизации.
            </p>

            <div className="mt-4 flex gap-6">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Цена, ₽ (из МойСклада)</div>
                <div className="mt-1 text-[14px] tabular-nums">{product.price}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Остаток (из МойСклада)</div>
                <div className="mt-1 text-[14px] tabular-nums">{product.quantity}</div>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="h-4 w-4" />
              Доступен для аренды/продажи
            </label>

            <label htmlFor={`${uid}-subtitle`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Подзаголовок (не синхронизируется)</label>
            <input
              id={`${uid}-subtitle`}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Например: Полный кадр · 4K 120p"
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label htmlFor={`${uid}-tag`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Бейдж на карточке (не синхронизируется)</label>
            <input
              id={`${uid}-tag`}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder={categoryName}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Изображения</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={img.id} className="relative w-24 rounded-xl border border-border p-1.5">
                  {/* C4 (design_handoff_swiss_bento/08-instruction.md, G3):
                      fixed 84x84 (w-24 card minus p-1.5 padding on both
                      sides) — real, server-persisted URLs from
                      uploadMedia()/mediaUrl(), same as the other admin
                      previews. */}
                  {img.url && <Image src={img.url} width={84} height={84} className="aspect-square w-full rounded-lg object-cover" alt="" />}
                  <div className="mt-1 flex items-center justify-between">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="text-[11px] text-subtle hover:text-foreground disabled:opacity-30">←</button>
                    <button type="button" onClick={() => removeImage(i)} className="text-[11px] text-accent hover:text-status-alert">✕</button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} className="text-[11px] text-subtle hover:text-foreground disabled:opacity-30">→</button>
                  </div>
                </div>
              ))}
            </div>
            <input type="file" accept="image/*" onChange={handleAddImage} className="mt-3 w-full max-w-full text-[13px]" />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Набор</div>
            {product.isKit ? (
              <div className="mt-2 text-[13px]">
                <p>Этот товар — набор{product.oldPrice != null ? <>, цена по отдельности: <span className="tabular-nums">{product.oldPrice} ₽</span></> : null}.</p>
                {(product.kitItems ?? []).length > 0 && (
                  <ol className="mt-2 list-decimal pl-5 text-[12.5px] text-subtle">
                    {(product.kitItems ?? []).map((item, i) => <li key={i}>{item.label}</li>)}
                  </ol>
                )}
                <p className="mt-2 text-[11.5px] text-subtle">Состав набора редактируется только через API (в админке — на чтение).</p>
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-subtle">Не набор.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
