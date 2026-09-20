import { getAdminKpi } from './kpi'
import { getAdminStock } from './stock'
import { getAdminClients } from './clients'

// Badge counts for AdminSidebar's nav items. The delivered mockup's sidebar
// badges (Заказы 7, Склад 38, Клиенты 3 — docs/design-reference/
// template.html's adminNav array) are hardcoded mock data with no backing
// model, same as its KPI row (see AdminKpiWidget.tsx's own comment, 2026-08-
// 14) — not numbers to copy verbatim. "Заказы"/"Склад" reuse the dashboard
// KPI cards' own "needs attention" semantics (pending orders, out-of-stock/
// low-stock products) rather than a lifetime total — a nav badge is more
// useful as an action count. "Клиенты" has no equivalent "needs attention"
// subset, so it's the plain distinct-client count.
export interface AdminNavBadges {
  orders: number
  stock: number
  clients: number
}

export async function getAdminNavBadges(): Promise<AdminNavBadges> {
  if (process.env.VISUAL_REFERENCE_MODE === 'true') {
    return { orders: 7, stock: 38, clients: 3 }
  }
  const [kpi, stock, clients] = await Promise.all([getAdminKpi(), getAdminStock(), getAdminClients()])

  return {
    orders: kpi.pendingCount,
    stock: stock.filter((s) => s.status !== 'ok').length,
    clients: clients.length,
  }
}
