import type { OrderStatus } from './api'

export const rub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

// Matches apps/cms/src/components/admin/OrderStatusCell.tsx exactly — same
// tiers, same colors — so the two admin UIs read status the same way while
// both exist side by side (see docs/PLAN-docker-admin.md Step 8).
export const ORDER_STATUS_TONE: Record<OrderStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: '#FFF2DE', color: '#9A6100', label: 'Ожидает звонка' },
  confirmed: { bg: '#E4F6E9', color: '#0B6B32', label: 'Подтверждён' },
  completed: { bg: '#E8EDFF', color: '#1F3FBF', label: 'Завершён' },
  cancelled: { bg: '#FFE9E4', color: '#B03017', label: 'Отменён' },
}

// Matches apps/cms/src/components/admin/StockStatusCell.tsx exactly.
export const STOCK_STATUS_TONE: Record<'out' | 'low' | 'ok', { bg: string; color: string; label: string }> = {
  out: { bg: '#FFE9E4', color: '#B03017', label: 'Нет в наличии' },
  low: { bg: '#FFF2DE', color: '#9A6100', label: 'Мало' },
  ok: { bg: '#F0EFEC', color: '#0A0A0A', label: 'В наличии' },
}
