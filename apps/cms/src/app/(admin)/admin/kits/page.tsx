import type { Metadata } from 'next'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import AdminMobileCard from '../../../../components/admin/AdminMobileCard'
import { getAdminKits } from '../../../../lib/admin/data/kits'
import { rub } from '../../../../lib/admin/format'
import { pluralRu } from '../../../../lib/text/plural'

// Kits ("Наборы") management — kits are ordinary products (isKit:true)
// assembled by hand from already-synced МойСклад items; this is the only
// place in the admin UI where a product row can be created manually.
// Editing happens on /admin/kits/[id]; creation on /admin/kits/new.
export const metadata: Metadata = { title: 'Наборы' }
export const dynamic = 'force-dynamic'

export default async function AdminKitsPage() {
  const kits = await getAdminKits()

  return (
    <>
      <AdminPageHeader title="Наборы" subtitle={`${kits.length} ${pluralRu(kits.length, 'набор', 'набора', 'наборов')}`} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-[12.5px] leading-snug text-subtle">
          Набор собирается из товаров, уже синхронизированных из МойСклада. Состав и цены ведутся здесь; синхронизация наборов не касается.
        </p>
        <Link href="/admin/kits/new" className="btn-primary shrink-0">+ Создать набор</Link>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <div className="hidden grid-cols-[2fr_1.2fr_90px_110px_110px_130px] gap-3.5 px-2.5 pb-3 text-[10px] font-semibold tracking-[0.13em] text-subtle uppercase lg:grid">
          <span>Набор</span><span>Категория</span><span>Состав</span><span>Цена</span><span>Комплект</span><span>Статус</span>
        </div>
        <div className="flex flex-col gap-2.5 lg:contents">
          {kits.map((k, i) => {
            const badge = (
              <span
                className="justify-self-start rounded-full px-3 py-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase"
                style={
                  !k.available || k.quantity === 0
                    ? { background: '#FFE9E4', color: '#B03017' }
                    : { background: '#F0EFEC', color: '#0A0A0A' }
                }
              >
                {!k.available || k.quantity === 0 ? 'Нет в наличии' : 'В наличии'}
              </span>
            )
            return (
              <FragmentRow key={k.id} kit={k} badge={badge} index={i} />
            )
          })}
        </div>
        {kits.length === 0 ? (
          <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Пока нет наборов</div>
        ) : null}
      </div>
    </>
  )
}

function FragmentRow({ kit, badge, index }: { kit: Awaited<ReturnType<typeof getAdminKits>>[number]; badge: React.ReactNode; index: number }) {
  return (
    <>
      <Link
        href={`/admin/kits/${kit.id}`}
        className="hidden grid-cols-[2fr_1.2fr_90px_110px_110px_130px] items-center gap-3.5 rounded-2xl px-2.5 py-3.5 text-[13.5px] transition-colors duration-240 ease-expo hover:bg-muted lg:grid"
        style={{ animation: 'bnIn 560ms var(--ease-expo) both', animationDelay: `${Math.min(index * 55, 400)}ms` }}
      >
        <span className="truncate font-medium">{kit.title}</span>
        <span className="truncate text-[12.5px] text-subtle">{kit.category ?? '—'}</span>
        <span>{kit.componentCount} поз.</span>
        <span className="font-semibold">{rub(kit.price)}</span>
        <span className="text-[12.5px] text-subtle">{kit.oldPrice != null ? rub(kit.oldPrice) : '—'}</span>
        {badge}
      </Link>
      <AdminMobileCard
        href={`/admin/kits/${kit.id}`}
        title={kit.title}
        badge={badge}
        fields={[
          { label: 'Состав', value: `${kit.componentCount} поз.` },
          { label: 'Цена', value: rub(kit.price) },
          { label: 'Остаток', value: kit.quantity },
        ]}
      />
    </>
  )
}
