import { redirect } from 'next/navigation'

// Ported from apps/web/src/pages/admin/index.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 2) — verbatim: bare /admin has never
// been a real page, 'orders' is the design's default admin tab and this
// just lands there.
export default function AdminIndexPage() {
  redirect('/admin/orders')
}
