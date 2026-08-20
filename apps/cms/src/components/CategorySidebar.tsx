'use client'

// Ported from apps/web/src/components/CategorySidebar.astro (docs/PLAN-
// next-migration.md Stage 2). 'use client': the mobile <select>'s
// onChange needs a real handler (window.location.href = ...), which
// Astro's plain onchange="..." string attribute can't express in JSX —
// everything else here is static, server-fetchable data passed down as
// props from CatalogPage.tsx.
import type { Category } from '../payload-types'
import { buildCategoryTree, flattenCategoryTree } from '../lib/categoryTree'

interface Props {
  categories: Category[]
  categoryCounts: Map<number, number>
  totalCount: number
  activeSlug?: string
  searchQuery?: string
  sort: string
}

function withQuery(searchQuery: string | undefined, href: string, extra: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams()
  if (searchQuery) params.set('q', searchQuery)
  for (const [k, v] of Object.entries(extra)) if (v) params.set(k, v)
  const qs = params.toString()
  return qs ? `${href}?${qs}` : href
}

const SORTS: { id: string; label: string }[] = [
  { id: 'pop', label: 'По популярности' },
  { id: 'asc', label: 'Сначала дешевле' },
  { id: 'desc', label: 'Сначала дороже' },
]

export default function CategorySidebar({ categories, categoryCounts, totalCount, activeSlug, searchQuery, sort }: Props) {
  const orderedCategories = flattenCategoryTree(buildCategoryTree(categories))

  return (
    <>
      <div className="col-span-full lg:hidden">
        <select
          className="w-full rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[14px] font-medium"
          defaultValue={activeSlug ? withQuery(searchQuery, `/catalog/${activeSlug}`, { sort }) : withQuery(searchQuery, '/catalog', { sort })}
          onChange={(e) => {
            if (e.target.value) window.location.href = e.target.value
          }}
        >
          <option value={withQuery(searchQuery, '/catalog', { sort })}>Все категории ({totalCount})</option>
          {orderedCategories.map(({ category: c, depth }) => (
            <option key={c.id} value={withQuery(searchQuery, `/catalog/${c.slug}`, { sort })}>
              {'  '.repeat(depth)}
              {depth > 0 ? '— ' : ''}
              {c.name} ({categoryCounts.get(c.id) ?? 0})
            </option>
          ))}
        </select>
      </div>

      <aside className="hidden lg:col-span-3 lg:block">
        <div className="sticky top-[96px] rounded-3xl border border-border bg-card p-[22px]">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Категория</div>
          <div className="mt-2.5 flex flex-col gap-0.5">
            <a
              href={withQuery(searchQuery, '/catalog', { sort })}
              className={`flex items-center justify-between rounded-xl border-none px-3.5 py-[11px] text-[13.5px] transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground ${!activeSlug ? 'bg-primary text-primary-foreground' : 'bg-transparent'}`}
            >
              <span>Все позиции</span>
              <span className="text-[11px] opacity-55">{totalCount}</span>
            </a>
            {orderedCategories.map(({ category: c, depth }) => (
              <a
                key={c.id}
                href={withQuery(searchQuery, `/catalog/${c.slug}`, { sort })}
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
                href={withQuery(searchQuery, activeSlug ? `/catalog/${activeSlug}` : '/catalog', { sort: s.id })}
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
              <span data-only-free-knob className="h-[18px] w-[18px] translate-x-0 rounded-full bg-white transition-transform duration-[320ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]"></span>
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
    </>
  )
}
