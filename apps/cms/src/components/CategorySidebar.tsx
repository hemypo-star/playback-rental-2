'use client'

// Ported from apps/web/src/components/CategorySidebar.astro (docs/PLAN-
// next-migration.md Stage 2). 'use client': the mobile <select>'s
// onChange needs a real handler (window.location.href = ...), which
// Astro's plain onchange="..." string attribute can't express in JSX —
// everything else here is static, server-fetchable data passed down as
// props from CatalogPage.tsx.
//
// C1 (design_handoff_swiss_bento/08-instruction.md, G2): the category/sort/
// reset <a> tags below are deliberately NOT next/link, considered and
// rejected during C1. They can navigate to a URL that resolves to the
// *same* page.tsx (a sort/query change on /catalog, or /catalog itself from
// a different /catalog/[slug]) — Next reconciles that as a re-render of the
// already-mounted page, not a fresh mount, so CatalogAvailabilityInit's
// effect (`useEffect(() => initCatalogAvailability(), [])`, see that file)
// would not re-run and its one-time DOM snapshot of the product grid would
// go stale against the newly server-rendered cards. A hard navigation avoids
// that by construction. Making the effect itself survive a same-route
// client-side navigation is a catalog-refresh change (adjacent to C2/C5),
// not part of C1.
import type { Category } from '../payload-types'
import { buildCategoryTree, flattenCategoryTree } from '../lib/categoryTree'
import { buildCatalogUrl } from '../lib/catalogQuery'

interface Props {
  categories: Category[]
  categoryCounts: Map<number, number>
  totalCount: number
  activeSlug?: string
  searchQuery?: string
  sort: string
  // C6 (design_handoff_swiss_bento/08-instruction.md, N8): only the sort
  // links need this — a category link always navigates to /catalog or
  // /catalog/[slug], and [slug]'s own route never reads `type=kit` (see its
  // page.tsx), so kit mode is only ever reachable from bare /catalog in the
  // first place. Picking a category is deliberately a different facet from
  // "Наборы", not a combination of the two — that's an existing routing
  // decision, not something this fix changes. A sort link, though, is meant
  // to keep the visitor on the exact same view they're already looking at
  // (still /catalog?type=kit) and just re-order it, so it has to carry kit
  // forward the same way the search form now does.
  kitOnly?: boolean
}

const SORTS: { id: string; label: string }[] = [
  { id: 'pop', label: 'По популярности' },
  { id: 'asc', label: 'Сначала дешевле' },
  { id: 'desc', label: 'Сначала дороже' },
]

export default function CategorySidebar({ categories, categoryCounts, totalCount, activeSlug, searchQuery, sort, kitOnly = false }: Props) {
  const orderedCategories = flattenCategoryTree(buildCategoryTree(categories))

  return (
    <aside className="col-span-6 min-[1021px]:col-span-3">
      <div className="rounded-3xl border border-border bg-card p-[22px] min-[1021px]:sticky min-[1021px]:top-[96px]">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Категория</div>
        <div className="mt-2.5 flex flex-col gap-0.5">
          <a
            href={buildCatalogUrl('/catalog', { q: searchQuery, sort })}
            className={`flex items-center justify-between rounded-xl border-none px-3.5 py-[11px] text-[13.5px] transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${!activeSlug ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}
          >
            <span>Все позиции</span>
            <span className="text-[11px] opacity-55">{totalCount}</span>
          </a>
          {orderedCategories.map(({ category: c, depth }) => (
            <a
              key={c.id}
              href={buildCatalogUrl(`/catalog/${c.slug}`, { q: searchQuery, sort })}
              style={{ paddingLeft: `${14 + depth * 14}px` }}
              className={`flex items-center justify-between rounded-xl border-none py-[11px] pr-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${activeSlug === c.slug ? 'bg-primary text-primary-foreground' : depth > 0 ? 'bg-transparent text-subtle' : 'bg-transparent'}`}
            >
              <span>{c.name}</span>
              <span className="text-[11px] opacity-55">{categoryCounts.get(c.id) ?? 0}</span>
            </a>
          ))}
        </div>

        <div className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Сортировка</div>
        <div className="mt-2.5 flex flex-col gap-0.5">
          {SORTS.map((s) => (
            <a
              key={s.id}
              href={buildCatalogUrl(activeSlug ? `/catalog/${activeSlug}` : '/catalog', { q: searchQuery, sort: s.id, kit: kitOnly })}
              className={`rounded-xl border-none px-3.5 py-[11px] text-[13.5px] transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${sort === s.id ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}
            >
              {s.label}
            </a>
          ))}
        </div>

        <button
          type="button"
          data-only-free-toggle
          data-checked="false"
          className="mt-6 flex w-full items-center justify-between gap-3 rounded-[14px] bg-muted px-3.5 py-[13px] transition-colors duration-240 ease-expo"
        >
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">Только свободные</span>
          <span data-only-free-track className="flex h-6 w-[42px] shrink-0 rounded-full bg-[rgba(10,10,10,0.12)] p-[3px] transition-colors duration-240 ease-expo">
            <span data-only-free-knob className="h-[18px] w-[18px] translate-x-0 rounded-full bg-white transition-transform duration-320 ease-overshoot"></span>
          </span>
        </button>

        <a
          href="/catalog"
          className="mt-3.5 block rounded-xl py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle transition-colors duration-240 ease-expo hover:text-accent"
        >
          Сбросить фильтры
        </a>
      </div>
    </aside>
  )
}
