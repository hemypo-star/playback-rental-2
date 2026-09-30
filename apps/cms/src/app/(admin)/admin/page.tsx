import { redirect } from 'next/navigation'

// Ported from apps/web/src/pages/admin/index.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 2) — verbatim: bare /admin has never
// been a real page, 'orders' is the design's default admin tab and this
// just lands there.
//
// force-dynamic: every sibling admin page declares this because it fetches
// real data; this one doesn't, but its shared layout does (getAdminUser(),
// getAdminNavBadges()) — real DB queries. Without this marker, `next build`
// attempts to statically prerender this one page (nothing else about it
// looks dynamic to Next's analysis) and executes the layout for real,
// which fails outright against the build stage's placeholder, unreachable
// DATABASE_URI (see apps/cms/Dockerfile's build stage comment).
export const dynamic = 'force-dynamic'

export default function AdminIndexPage() {
  redirect('/admin/orders')
}
