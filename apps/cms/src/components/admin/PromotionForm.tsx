'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/promotions/
// [id].astro (docs/PLAN-next-migration.md Stage 3.4/3.5) — same fields,
// same save/delete behavior. Calls the Server Actions in ./actions.ts
// instead of fetch()-ing Payload's REST endpoints directly.
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Category, Product, Promotion } from '../../payload-types'
import { mediaUrl } from '../../lib/mediaUrl'
import { uploadMedia } from '../../lib/admin/mediaUpload'
import { savePromotion, deletePromotion } from '../../app/(admin)/admin/promotions/[id]/actions'

interface Props {
  promo: Promotion | null
  allCategories: Category[]
  allProducts: Product[]
}

function selectedIds(select: HTMLSelectElement): number[] {
  return Array.from(select.selectedOptions).map((o) => Number(o.value))
}

export default function PromotionForm({ promo, allCategories, allProducts }: Props) {
  const router = useRouter()
  const isNew = promo === null

  const [title, setTitle] = useState(promo?.title ?? '')
  const [slug, setSlug] = useState(promo?.slug ?? '')
  const [kicker, setKicker] = useState(promo?.kicker ?? '')
  const [text, setText] = useState(promo?.text ?? '')
  const [content, setContent] = useState(promo?.content ?? '')
  const [linkUrl, setLinkUrl] = useState(promo?.linkUrl ?? '')
  const [active, setActive] = useState(promo?.active ?? true)
  const [order, setOrder] = useState(promo?.order ?? 0)
  const [imageId, setImageId] = useState<number | null>(typeof promo?.image === 'object' ? (promo?.image?.id ?? null) : (promo?.image ?? null))
  const [imagePreview, setImagePreview] = useState<string | undefined>(mediaUrl(promo?.image))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const linkedProductIds = new Set((promo?.linkedProducts ?? []).map((p) => (typeof p === 'object' ? p.id : p)))
  const linkedCategoryIds = new Set((promo?.linkedCategories ?? []).map((c) => (typeof c === 'object' ? c.id : c)))

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const media = await uploadMedia(file)
      setImageId(media.id)
      setImagePreview(media.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
    }
  }

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    setError(null)
    if (!imageId) {
      setError('Изображение обязательно')
      return
    }
    const form = e.currentTarget
    const linkedProducts = selectedIds(form.elements.namedItem('linkedProducts') as HTMLSelectElement)
    const linkedCategories = selectedIds(form.elements.namedItem('linkedCategories') as HTMLSelectElement)

    setSaving(true)
    const result = await savePromotion(isNew ? null : promo!.id, {
      title,
      slug: slug || undefined,
      kicker,
      text,
      content,
      linkUrl,
      active,
      order: Number(order) || 0,
      image: imageId,
      linkedProducts,
      linkedCategories,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Не удалось сохранить')
      return
    }
    router.push(isNew ? `/admin/promotions/${result.id}` : '/admin/promotions')
  }

  const handleDelete = async () => {
    if (!confirm('Удалить эту акцию?')) return
    setError(null)
    const result = await deletePromotion(promo!.id)
    if (result.success) {
      router.push('/admin/promotions')
    } else {
      setError(result.error || 'Не удалось удалить')
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void handleSave(e)
      }}
    >
      {error && <p className="rounded-2xl bg-[#FFE9E4] px-4 py-3 text-[13px] text-[#B03017]">{error}</p>}

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <label className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Название</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">
              Slug <span className="normal-case text-subtle/70">(если пусто — сгенерируется из названия)</span>
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Кикер (над заголовком в карусели)</label>
            <input
              value={kicker}
              onChange={(e) => setKicker(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Короткий текст (в карусели)</label>
            <textarea
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="mt-1.5 w-full resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Полный текст (на странице акции)</label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1.5 w-full resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Ссылка (необязательно)</label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label className="mt-4 flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
              Активна (показывать в карусели)
            </label>

            <label className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Порядок</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="mt-1.5 h-11 w-40 rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Изображение (обязательно, 3:4)</div>
            <div className="mt-3 flex items-center gap-4">
              {imagePreview ? <img src={imagePreview} className="h-24 w-20 rounded-xl bg-muted object-cover" alt="" /> : null}
              <input type="file" accept="image/*" onChange={handleImageChange} className="text-[13px]" />
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Товары на странице акции</div>
            <select name="linkedProducts" multiple size={8} defaultValue={[...linkedProductIds].map(String)} className="mt-3 w-full rounded-xl border border-input bg-muted-well px-2 py-2 text-[13px] outline-none focus:border-foreground">
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11.5px] text-subtle">Ctrl/Cmd + клик для выбора нескольких.</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Категории на странице акции</div>
            <select name="linkedCategories" multiple size={6} defaultValue={[...linkedCategoryIds].map(String)} className="mt-3 w-full rounded-xl border border-input bg-muted-well px-2 py-2 text-[13px] outline-none focus:border-foreground">
              {allCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
              {isNew ? 'Создать' : 'Сохранить'}
            </button>
            {!isNew ? (
              <button
                type="button"
                onClick={handleDelete}
                className="mt-3 w-full rounded-full bg-transparent px-4 py-2.5 text-[11px] font-semibold tracking-[0.1em] text-accent uppercase transition-colors duration-240 ease-expo hover:bg-accent hover:text-white"
              >
                Удалить акцию
              </button>
            ) : null}
            {!isNew && promo?.slug ? (
              <a href={`/promotions/${promo.slug}`} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-[12px] text-subtle hover:text-accent">
                Открыть на сайте →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  )
}
