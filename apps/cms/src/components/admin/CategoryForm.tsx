'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/categories/
// [id].astro (docs/PLAN-next-migration.md Stage 3.4/3.5) — same fields,
// same save/delete behavior. Calls the Server Actions in ./actions.ts
// instead of fetch()-ing Payload's REST endpoints directly.
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import Image from 'next/image'
import type { Category } from '../../payload-types'
import { mediaUrl } from '../../lib/mediaUrl'
import { uploadMedia } from '../../lib/admin/mediaUpload'
import { saveCategory, deleteCategory } from '../../app/(admin)/admin/categories/[id]/actions'

interface Props {
  category: Category | null
  parentOptions: { category: Category; depth: number }[]
  currentParentId: number | null
}

export default function CategoryForm({ category, parentOptions, currentParentId }: Props) {
  const router = useRouter()
  const uid = useId()
  const isNew = category === null

  const [name, setName] = useState(category?.name ?? '')
  const [slug, setSlug] = useState(category?.slug ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [tag, setTag] = useState(category?.tag ?? '')
  const [order, setOrder] = useState(category?.order ?? 0)
  const [parent, setParent] = useState(currentParentId === null ? '' : String(currentParentId))
  const [imageId, setImageId] = useState<number | null>(typeof category?.image === 'object' ? (category?.image?.id ?? null) : (category?.image ?? null))
  const [imagePreview, setImagePreview] = useState<string | undefined>(mediaUrl(category?.image))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    const result = await saveCategory(isNew ? null : category!.id, {
      name,
      slug,
      description,
      tag,
      order: Number(order) || 0,
      image: imageId,
      parent: parent ? Number(parent) : null,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Не удалось сохранить')
      return
    }
    router.push(isNew ? `/admin/categories/${result.id}` : '/admin/categories')
  }

  const handleDelete = async () => {
    if (!confirm('Удалить эту категорию?')) return
    setError(null)
    const result = await deleteCategory(category!.id)
    if (result.success) {
      router.push('/admin/categories')
    } else {
      setError(result.error || 'Не удалось удалить — возможно, есть связанные товары')
    }
  }

  return (
    <>
      {error && <p className="rounded-2xl bg-status-alert-bg px-4 py-3 text-[13px] text-status-alert">{error}</p>}

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <label htmlFor={`${uid}-name`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Название</label>
            <input
              id={`${uid}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label htmlFor={`${uid}-slug`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Slug</label>
            <input
              id={`${uid}-slug`}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label htmlFor={`${uid}-description`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Описание</label>
            <textarea
              id={`${uid}-description`}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1.5 w-full resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label htmlFor={`${uid}-tag`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Тег (бейдж на плитке)</label>
            <input
              id={`${uid}-tag`}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label htmlFor={`${uid}-order`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Порядок</label>
            <input
              id={`${uid}-order`}
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="mt-1.5 h-11 w-40 rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />

            <label htmlFor={`${uid}-parent`} className="mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Родительская категория</label>
            <select
              id={`${uid}-parent`}
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            >
              <option value="">— нет (верхний уровень) —</option>
              {parentOptions.map(({ category: c, depth }) => (
                <option key={c.id} value={c.id}>
                  {'— '.repeat(depth)}
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11.5px] text-subtle">Определяет вложенность в каталоге и на главной. Пусто — категория верхнего уровня.</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Изображение</div>
            <div className="mt-3 flex items-center gap-4">
              {/* C4 (design_handoff_swiss_bento/08-instruction.md, G3):
                  admin thumbnail, fixed 80x80 at every breakpoint — width/
                  height, not fill/sizes, same reasoning as the checkout
                  cart thumbnail. imagePreview is always either the existing
                  Media doc's own URL or a freshly-uploaded one from
                  uploadMedia() (see handleImageChange below) — a real
                  server-persisted /api/media/file/... path, never a
                  client-only blob: URL next/image couldn't optimize. */}
              {imagePreview ? <Image src={imagePreview} width={80} height={80} className="rounded-xl bg-muted object-cover" alt="" /> : null}
              <input type="file" accept="image/*" onChange={handleImageChange} className="text-[13px]" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
              {isNew ? 'Создать' : 'Сохранить'}
            </button>
            {!isNew ? (
              <button
                type="button"
                onClick={handleDelete}
                className="mt-3 w-full rounded-full bg-transparent px-4 py-2.5 text-[11px] font-semibold tracking-[0.1em] text-accent uppercase transition-colors duration-240 ease-expo hover:bg-accent hover:text-white"
              >
                Удалить категорию
              </button>
            ) : null}
          </div>
          {category?.moySkladFolderId ? (
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">МойСклад</div>
              <div className="mt-2 text-[12.5px] text-subtle">Синхронизируется, id: {category.moySkladFolderId}</div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}
