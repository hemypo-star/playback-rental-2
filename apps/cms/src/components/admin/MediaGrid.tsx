'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/media.astro
// (docs/PLAN-next-migration.md Stage 3.4/3.5) — same per-item alt-text
// save + delete behavior, as React state instead of raw DOM manipulation.
import { useState } from 'react'
import Image from 'next/image'
import type { Media } from '../../payload-types'
import { mediaUrl } from '../../lib/mediaUrl'
import { updateMediaAlt, deleteMedia } from '../../app/(admin)/admin/media/actions'

// C4 (design_handoff_swiss_bento/08-instruction.md, G3): admin is
// explicitly lower priority than the storefront per the instruction — this
// is a rough-but-real estimate (the admin shell's 246px sticky sidebar +
// gap + padding eaten from the viewport, then this grid's own 2/4/6-column
// breakpoints), not pixel-measured against every admin viewport the way the
// storefront slots above are. Good enough to stop serving full-size
// originals into a 6-up thumbnail grid without over-engineering a screen
// the design doesn't cover at all (AdminSidebar's own comment already flags
// this whole page as undesigned).
const MEDIA_GRID_SIZES = '(min-width: 1024px) 12vw, (min-width: 640px) 14vw, 30vw'

export default function MediaGrid({ items: initialItems }: { items: Media[] }) {
  const [items, setItems] = useState(initialItems)
  const [alts, setAlts] = useState<Record<number, string>>(() => Object.fromEntries(initialItems.map((m) => [m.id, m.alt ?? ''])))
  const [error, setError] = useState<string | null>(null)

  const handleSaveAlt = async (id: number) => {
    setError(null)
    const result = await updateMediaAlt(id, alts[id] ?? '')
    if (!result.success) setError(result.error || 'Не удалось сохранить alt-текст')
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот файл? Если он используется в товаре/акции/категории, удаление может нарушить отображение.')) return
    setError(null)
    const result = await deleteMedia(id)
    if (result.success) {
      setItems((prev) => prev.filter((m) => m.id !== id))
    } else {
      setError(result.error || 'Не удалось удалить — возможно, файл используется')
    }
  }

  return (
    <>
      {error && <p className="rounded-2xl bg-[#FFE9E4] px-4 py-3 text-[13px] text-[#B03017]">{error}</p>}

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((m) => (
          <div key={m.id} className="rounded-xl border border-border p-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
              {mediaUrl(m) && <Image src={mediaUrl(m) as string} alt="" fill sizes={MEDIA_GRID_SIZES} className="object-cover" />}
            </div>
            <input
              type="text"
              value={alts[m.id] ?? ''}
              onChange={(e) => setAlts((prev) => ({ ...prev, [m.id]: e.target.value }))}
              placeholder="Alt текст"
              className="mt-1.5 h-8 w-full rounded-lg border border-input bg-muted-well px-2 text-[11.5px] outline-none focus:border-foreground focus:bg-white"
            />
            <div className="mt-1.5 flex items-center justify-between">
              <button type="button" onClick={() => handleSaveAlt(m.id)} className="text-[10.5px] font-semibold text-subtle hover:text-foreground">
                Сохранить
              </button>
              <button type="button" onClick={() => handleDelete(m.id)} className="text-[10.5px] font-semibold text-accent hover:text-[#B03017]">
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Пока нет файлов</div> : null}
    </>
  )
}
