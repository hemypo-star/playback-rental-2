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
import ImageDropzone from './ImageDropzone'
import { saveProduct, syncProduct } from '../../app/(admin)/admin/products/[id]/actions'

interface Props {
  product: Product
  categoryName: string
  // All non-kit products (id/title/price/listingType) — the picker source
  // for "Совместимые аксессуары". Passed from the server page so the client
  // doesn't hit the REST API itself.
  accessoryOptions?: { id: number; title: string; price: number; listingType: string }[]
}

interface ImageItem {
  id: number
  url: string
}

export default function ProductForm({ product, categoryName, accessoryOptions = [] }: Props) {
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
  // Compatible accessories: resolved to full docs at page load (depth), so
  // selected rows show title/price even when the picker list is filtered.
  const [accessories, setAccessories] = useState<{ id: number; title: string; price: number }[]>(
    (product.compatibleAccessories ?? [])
      .filter((a): a is Product => typeof a === 'object' && a !== null)
      .map((a) => ({ id: a.id, title: a.title, price: Number(a.price ?? 0) })),
  )
  const [accessoryQuery, setAccessoryQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  // Storefront fields (title/description/subtitle/tag/images/available) are
  // editable here; sync preserves them once edited locally. "Синхронизировать"
  // re-adopts title/description/category/images from МойСклад for this row,
  // discarding local edits to those fields.
  const handleSync = async () => {
    setError(null)
    setSyncMsg(null)
    if (
      !window.confirm(
        'Принудительно подтянуть данные МойСклада для этого товара? Локальные правки названия/описания/категории/фото будут заменены значениями из МойСклада.',
      )
    ) {
      return
    }
    setSyncing(true)
    const result = await syncProduct(product.id)
    setSyncing(false)
    if (result.success) {
      // Pull the freshly synced read-only values (цена/остаток/lastSyncedAt)
      // into the page — the server component re-runs with force-dynamic.
      router.refresh()
      setSyncMsg('Синхронизировано из МойСклада')
    } else {
      setError(result.error || 'Не удалось синхронизировать')
    }
  }

  // Drag-and-drop / click multi-upload via the shared ImageDropzone.
  // Upload goes to the multipart route handler — NOT a Server Action and
  // not the /api/media Payload endpoint: RSC actions serialize FormData
  // through an internal blob store that 500s on large images (React error
  // #418/#441 seen in production), same fix as the kits page.
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
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  // --- Compatible accessories picker -------------------------------------
  const selectedAccessoryIds = new Set(accessories.map((a) => a.id))
  const addAccessory = (id: number) => {
    if (selectedAccessoryIds.has(id)) return
    const opt = accessoryOptions.find((o) => o.id === id)
    if (!opt) return
    setAccessories((prev) => [...prev, { id: opt.id, title: opt.title, price: opt.price }])
  }
  const removeAccessory = (id: number) => {
    setAccessories((prev) => prev.filter((a) => a.id !== id))
  }
  const moveAccessory = (index: number, dir: -1 | 1) => {
    setAccessories((prev) => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const accessoryCandidates = accessoryOptions
    .filter((o) => !selectedAccessoryIds.has(o.id))
    .filter((o) => accessoryQuery.trim() === '' || o.title.toLowerCase().includes(accessoryQuery.trim().toLowerCase()))
    .slice(0, 30)

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    // Only the storefront-editable fields are sent (see Products collection):
    // price/quantity/isKit/oldPrice/kitItems and MoySklad* are read-only here.
    // compatibleAccessories is curated in this panel too (never synced).
    const result = await saveProduct(product.id, {
      title: title.trim(),
      description,
      available,
      subtitle,
      tag,
      images: images.map((img) => img.id),
      compatibleAccessories: accessories.map((a) => a.id),
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

      {/* Same layout as the kit editor (KitForm): main column + photos aside */}
      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_340px]">
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
              Название и описание редактируются свободно — синхронизация обновляет их из МойСклада только пока они не менялись из админки. Кнопка «Синхронизировать» принудительно подтягивает данные МойСклада для этого товара (цену, остаток и несменённые вручную название/описание).
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="h-10 rounded-xl border border-input bg-muted-well px-4 text-[13px] font-semibold hover:border-foreground disabled:opacity-50"
              >
                {syncing ? 'Синхронизация…' : 'Синхронизировать из МойСклада'}
              </button>
              {syncMsg && <span className="text-[12.5px] text-status-ok">{syncMsg}</span>}
              {product.lastSyncedAt && (
                <span className="text-[11.5px] text-subtle">
                  Последняя синхронизация: {new Date(product.lastSyncedAt).toLocaleString('ru-RU')}
                </span>
              )}
            </div>

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
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Совместимые аксессуары</div>
            <p className="mt-2 text-[12px] leading-snug text-subtle">
              Товары, которые подходят к этому (напр. стедикам к камере). Показываются на витрине блоком «Подойдёт к этому товару». Не синхронизируются с МойСкладом.
            </p>

            {accessories.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {accessories.map((a, i) => (
                  <li key={a.id} className="flex items-center gap-2 rounded-xl border border-border bg-muted-well px-3 py-2 text-[13px]">
                    <span className="min-w-0 flex-1 truncate">{a.title}</span>
                    <span className="shrink-0 tabular-nums text-subtle">{a.price} ₽</span>
                    <button type="button" onClick={() => moveAccessory(i, -1)} disabled={i === 0} className="text-[11px] text-subtle hover:text-foreground disabled:opacity-30">←</button>
                    <button type="button" onClick={() => moveAccessory(i, 1)} disabled={i === accessories.length - 1} className="text-[11px] text-subtle hover:text-foreground disabled:opacity-30">→</button>
                    <button type="button" onClick={() => removeAccessory(a.id)} className="text-[11px] text-accent hover:text-status-alert">✕</button>
                  </li>
                ))}
              </ul>
            )}

            <input
              value={accessoryQuery}
              onChange={(e) => setAccessoryQuery(e.target.value)}
              placeholder="Поиск по складу…"
              className={`mt-3 h-10 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[13px] outline-none focus:border-foreground focus:bg-white`}
            />
            {accessoryQuery.trim() !== '' && accessoryCandidates.length === 0 && (
              <p className="mt-2 text-[12px] text-subtle">Ничего не найдено.</p>
            )}
            {accessoryCandidates.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border">
                {accessoryCandidates.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => addAccessory(o.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-muted-well"
                    >
                      <span className="min-w-0 flex-1 truncate">{o.title}</span>
                      <span className="shrink-0 text-[11px] text-subtle">{o.listingType === 'rental' ? 'аренда' : 'продажа'}</span>
                      <span className="shrink-0 tabular-nums text-subtle">{o.price} ₽</span>
                      <span className="shrink-0 text-accent">+</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving || uploading} className="btn-primary">
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/stock')}
              className="h-10 rounded-xl border border-input px-4 text-[13px] font-semibold hover:border-foreground"
            >
              Отмена
            </button>
          </div>
        </div>

        {/* Photos — same aside as the kit editor (KitForm): 2-col previews,
            hover controls, "+ Добавить фото" button instead of a raw file input. */}
        <aside className="flex h-fit flex-col gap-3 rounded-3xl border border-border bg-card p-6">
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
    </>
  )
}
