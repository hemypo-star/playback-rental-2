// Ported from apps/web/src/lib/admin/format.ts (docs/PLAN-next-migration.md
// Stage 3.5, page group 3). Matches apps/cms/src/components/admin/
// OrderStatusCell.tsx/StockStatusCell.tsx exactly — same tiers, same
// colors — so /cms's native admin and the custom /admin UI read status the
// same way while both exist side by side (docs/PLAN-docker-admin.md Step 8).
export const rub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export const ORDER_STATUS_TONE: Record<OrderStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: '#FFF2DE', color: '#9A6100', label: 'Ожидает звонка' },
  confirmed: { bg: '#E4F6E9', color: '#0B6B32', label: 'Подтверждён' },
  completed: { bg: '#E8EDFF', color: '#1F3FBF', label: 'Завершён' },
  cancelled: { bg: '#FFE9E4', color: '#B03017', label: 'Отменён' },
}

export const STOCK_STATUS_TONE: Record<'out' | 'low' | 'ok', { bg: string; color: string; label: string }> = {
  out: { bg: '#FFE9E4', color: '#B03017', label: 'Нет в наличии' },
  low: { bg: '#FFF2DE', color: '#9A6100', label: 'Мало' },
  ok: { bg: '#F0EFEC', color: '#0A0A0A', label: 'В наличии' },
}
