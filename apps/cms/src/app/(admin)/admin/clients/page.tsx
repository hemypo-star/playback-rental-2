import type { Metadata } from 'next'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import { getAdminClients } from '../../../../lib/admin/data/clients'
import { rub } from '../../../../lib/admin/format'

// Ported from apps/web/src/pages/admin/clients.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 4).
export const metadata: Metadata = { title: 'Клиенты' }
export const dynamic = 'force-dynamic'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase() || '—'
}

export default async function AdminClientsPage() {
  const clients = await getAdminClients()

  return (
    <>
      <AdminPageHeader title="Клиенты" subtitle={`${clients.length} по не отменённым заказам, сгруппировано по email`} />

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {clients.map((c, i) => (
          <div
            key={c.email}
            className="flex items-center gap-4 rounded-[22px] border border-border bg-card p-5 transition-transform duration-300 ease-expo hover:-translate-y-1 hover:shadow-[0_26px_48px_-32px_rgba(10,10,10,0.42)]"
            style={{ animation: 'bnIn 560ms cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${Math.min(i * 60, 400)}ms` }}
          >
            <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground">
              {initials(c.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-medium tracking-[-0.02em]">{c.name}</div>
              <div className="mt-1 truncate text-[12.5px] text-subtle">
                {c.phone} · {c.orderCount} {c.orderCount === 1 ? 'заказ' : 'заказов'} · {rub(c.totalSpent)}
              </div>
            </div>
          </div>
        ))}
        {clients.length === 0 ? <div className="px-2.5 py-8 text-center text-[13.5px] text-subtle">Пока нет заказов</div> : null}
      </div>
    </>
  )
}
