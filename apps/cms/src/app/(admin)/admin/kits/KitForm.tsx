'use client'

// Kit editor form — kits are ordinary products (isKit:true) assembled from
// already-synced МойСклад items; this page is the one place in the admin UI
// where a product row can be created by hand. Fields mirror what the
// storefront renders for a kit card/page: title/description/subtitle/tag,
// price + oldPrice («по отдельности»), quantity/available, photos and the
// component picker («Что в комплекте» — chosen from synced products).
// System fields (moySkladId & friends) never appear here; saveKit() stamps
// a synthetic `kit-<uuid>` moySkladId so the sync job can't match this row.
import { useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { Category, Media } from '../../../../payload-types'
import { mediaUrl } from '../../../../lib/mediaUrl'
import ImageDropzone from '../../../../components/admin/ImageDropzone'
import type { KitEditData, KitComponentOption } from '../../../../lib/admin/data/kits'
import { saveKit, deleteKit, type KitActionResult } from './actions'

interface ImageItem {
  id: number
  url: string
}

interface Props {
  // null when creating a new kit (/admin/kits/new)
  kit: KitEditData | null
  components: KitComponentOption[]
  categories: Category[]
}

export default function KitForm({ kit, components, categories }: Props) {
  const router = useRouter()
  const uid = useId()

  const [title, setTitle] = useState(kit?.title ?? '')
  const [description, setDescription] = useState(kit?.description ?? '')
  const [subtitle, setSubtitle] = useState(kit?.subtitle ?? '')
  const [tag, setTag] = useState(kit?.tag ?? '')
  const [price, setPrice] = useState(kit ? String(kit.price) : '')
  // «По отдельности» считается сервером из состава; храним только сохранённое значение для отображения, пока состав не выбран.
  const [oldPrice] = useState(kit?.oldPrice != null ? String(kit.oldPrice) : "")
  const [quantity, setQuantity] = useState(kit ? String(kit.quantity) : '1')
  const [available, setAvailable] = useState(kit ? kit.available : true)
  const [category, setCategory] = useState<string>(kit?.category != null ? String(kit.category) : '')
  const [images, setImages] = useState<ImageItem[]>(kit?.images ?? [])
  const [componentIds, setComponentIds] = useState<number[]>(kit?.componentIds ?? [])
  const [search, setSearch] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const toggleComponent = (id: number) => {
    setError(null)
    setComponentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // Drag-and-drop / click multi-upload via the shared ImageDropzone.
  // Upload goes to a plain multipart route handler — NOT a Server Action:
  // RSC actions serialize FormData through an internal blob store that 500s
  // on large images (React error #418/#441 seen in production).
  const uploadOne = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/admin/kits/upload', { method: 'POST', body: fd })
    const result = (await res.json()) as { success: boolean; id?: number; url?: string; error?: string }
    if (result.success && result.id) {
      setImages((prev) => [...prev, { id: result.id as number, url: result.url ?? '' }])
    } else {
      throw new Error(result.error || 'Не удалось загрузить фото')
    }
  }

  const handleAddImages = async (files: File[]) => {
    setUploading(true)
    setError(null)
    try {
      for (const file of files) await uploadOne(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото (сетевая ошибка)')
    } finally {
      setUploading(false)
    }
  }

  const moveImage = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev]
      const j = index + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  }

  const handleSubmit = async () => {
    setError(null)
    setSaving(true)
    const result: KitActionResult = await saveKit(kit?.id ?? null, {
      title,
      description,
      subtitle,
      tag,
      price: Number(price),
      oldPrice: oldPrice.trim() === '' ? null : Number(oldPrice),
      quantity: Number(quantity),
      available,
      images: images.map((img) => img.id),
      category: category === '' ? null : Number(category),
      componentIds,
    })
    setSaving(false)
    if (result.success) {
      router.push('/admin/kits')
      router.refresh()
    } else {
      setError(result.error || 'Не удалось сохранить набор')
    }
  }

  const handleDelete = async () => {
    if (!kit) return
    if (!window.confirm(`Удалить набор «${kit.title}»? Обычные товары состава не удаляются.`)) return
    setDeleting(true)
    const result = await deleteKit(kit.id)
    setDeleting(false)
    if (result.success) {
      router.push('/admin/kits')
      router.refresh()
    } else {
      setError(result.error || 'Не удалось удалить набор')
    }
  }

  const q = search.trim().toLowerCase()
  const filteredComponents = q
    ? components.filter((c) => c.title.toLowerCase().includes(q))
    : components
  const selectedComponents = componentIds
    .map((id) => components.find((c) => c.id === id))
    .filter((c): c is KitComponentOption => Boolean(c))
  // «По отдельности» = сумма цен состава (суточная ставка аренды для
  // арендных позиций, цена продажи — для товаров «на продажу»).
  const componentsSum = selectedComponents.reduce((sum, c) => sum + Number(c.price || 0), 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-title`} className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Название *</label>
          <input
            id={`${uid}-title`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Набор: микрофоны + стойка"
            className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-description`} className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Описание</label>
          <textarea
            id={`${uid}-description`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-subtitle`} className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Подзаголовок</label>
            <input
              id={`${uid}-subtitle`}
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-tag`} className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Метка</label>
            <input
              id={`${uid}-tag`}
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-price`} className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Цена набора, ₽ *</label>
            <input
              id={`${uid}-price`}
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-oldprice`} className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">«По отдельности», ₽</label>
            <input
              id={`${uid}-oldprice`}
              type="number"
              min="0"
              step="1"
              readOnly
              value={componentsSum > 0 ? componentsSum : oldPrice}
              className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none text-subtle cursor-default"
            />
            <p className="text-[12px] leading-snug text-subtle">
              Считается автоматически: сумма суточных ставок аренды (или цен продажи) всех товаров состава.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-quantity`} className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Количество наборов</label>
            <input
              id={`${uid}-quantity`}
              type="number"
              min="0"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-category`} className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Категория</label>
            <select
              id={`${uid}-category`}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
            >
              <option value="">Без категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px] font-medium">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="h-4 w-4 accent-[var(--foreground)]" />
          Доступен для брони
        </label>

        {/* Состав набора */}
        <div className="flex flex-col gap-2.5">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Состав набора *</div>
          <p className="text-[12px] leading-snug text-subtle">
            Товары берутся из уже синхронизированного склада. Витрина показывает их как нумерованный список «Что в комплекте».
          </p>
          {selectedComponents.length > 0 && (
            <ol className="flex list-decimal flex-col gap-1 rounded-2xl border border-border bg-muted-well px-5 py-3 text-[13.5px]">
              {selectedComponents.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3">
                  <span>{c.title}</span>
                  <button
                    type="button"
                    onClick={() => toggleComponent(c.id)}
                    className="shrink-0 text-[11.5px] font-semibold text-subtle hover:text-foreground"
                  >
                    Убрать
                  </button>
                </li>
              ))}
            </ol>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по складу…"
            className="h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground"
          />
          <div className="max-h-64 overflow-y-auto rounded-2xl border border-border">
            {filteredComponents.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2.5 border-b border-border px-4 py-2.5 text-[13px] last:border-b-0 odd:bg-muted-well hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={componentIds.includes(c.id)}
                  onChange={() => toggleComponent(c.id)}
                  className="h-4 w-4 shrink-0 accent-[var(--foreground)]"
                />
                <span className="truncate">{c.title}</span>
                <span className="ml-auto shrink-0 text-[11px] uppercase tracking-wide text-subtle">
                  {c.listingType === 'rental' ? 'аренда' : 'продажа'}
                </span>
              </label>
            ))}
            {filteredComponents.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-subtle">Ничего не найдено</div>
            )}
          </div>
        </div>

        {error && <div className="rounded-xl bg-status-error-bg px-4 py-3 text-[13px] font-medium text-status-error">{error}</div>}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleSubmit} disabled={saving || uploading} className="btn-primary">
            {saving ? 'Сохранение…' : kit ? 'Сохранить набор' : 'Создать набор'}
          </button>
          {kit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="h-10 rounded-xl border border-status-error px-4 text-[13px] font-semibold text-status-error hover:bg-status-error-bg disabled:opacity-50"
            >
              {deleting ? 'Удаление…' : 'Удалить набор'}
            </button>
          )}
        </div>
      </div>

      {/* Photos */}
      <aside className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Фотографии</div>
        <div className="grid grid-cols-2 gap-3">
          {images.map((img, i) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted-well">
              {img.url ? (
                <Image src={mediaUrl({ id: img.id } as Media) ?? img.url} alt="" fill sizes="160px" className="object-cover" unoptimized />
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-black/50 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => moveImage(i, -1)} className="text-[11px] font-bold text-white">←</button>
                <button type="button" onClick={() => moveImage(i, 1)} className="text-[11px] font-bold text-white">→</button>
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((x) => x.id !== img.id))}
                  className="text-[11px] font-bold text-white"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        <ImageDropzone upload={uploading} onFiles={handleAddImages} label="+ Добавить фото" />
      </aside>
    </div>
  )
}
