import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import AdminMobileCard from '../../../../components/admin/AdminMobileCard'
import { getAdminPromotions } from '../../../../lib/admin/data/promotions'

// Ported from apps/web/src/pages/admin/promotions/index.astro (docs/PLAN-
// next-migration.md Stage 3.5, page group 5). Акции isn't in the delivered
// mockup either — same reasoning as categories/page.tsx.
export const metadata: Metadata = { title: 'Акции' }
export const dynamic = 'force-dynamic'

export default async function AdminPromotionsPage() {
  const promotions = await getAdminPromotions()

  return (
    <>
      <AdminPageHeader title="Акции" subtitle={`${promotions.length} акций`} actionLabel="Новая акция" actionHref="/admin/promotions/new" />

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="hidden grid-cols-[2.2fr_1fr_90px_100px] gap-3.5 px-2.5 pb-3 text-[10px] font-semibold tracking-[0.13em] text-subtle uppercase lg:grid">
          <span>Название</span><span>Slug</span><span>Порядок</span><span>Статус</span>
        </div>
        <div className="flex flex-col gap-2.5 lg:contents">
          {promotions.map((p) => {
            const badge = (
              <span
                className="justify-self-start rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={{ background: p.active ? 'var(--color-status-ok-bg)' : 'var(--color-status-neutral-bg)', color: p.active ? 'var(--color-status-ok)' : 'var(--color-subtle)' }}
              >
                {p.active ? 'Активна' : 'Скрыта'}
              </span>
            )
            return (
              <Fragment key={p.id}>
                <Link
                  href={`/admin/promotions/${p.id}`}
                  className="hidden grid-cols-[2.2fr_1fr_90px_100px] items-center gap-3.5 rounded-2xl px-2.5 py-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-muted lg:grid"
                >
                  <span className="truncate font-medium">{p.title}</span>
                  <span className="truncate text-[12.5px] text-subtle">{p.slug ?? '—'}</span>
                  <span>{p.order}</span>
                  {badge}
                </Link>
                <AdminMobileCard
                  href={`/admin/promotions/${p.id}`}
                  title={p.title}
                  badge={badge}
                  fields={[
                    { label: 'Slug', value: p.slug ?? '—' },
                    { label: 'Порядок', value: p.order },
                  ]}
                />
              </Fragment>
            )
          })}
        </div>
        {promotions.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Пока нет акций</div> : null}
      </div>
    </>
  )
}
