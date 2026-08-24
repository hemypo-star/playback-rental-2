import type { Metadata } from 'next'
import Link from 'next/link'
import AdminPageHeader from '../../../../components/admin/AdminPageHeader'
import MediaGrid from '../../../../components/admin/MediaGrid'
import { getAdminMedia } from '../../../../lib/admin/data/media'

// Ported from apps/web/src/pages/admin/media.astro (docs/PLAN-next-
// migration.md Stage 3.5, page group 6, "long tail" — Медиатека isn't in
// the delivered mockup either.
export const metadata: Metadata = { title: 'Медиатека' }
export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminMediaPage({ searchParams }: Props) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const result = await getAdminMedia(page)

  return (
    <>
      <AdminPageHeader title="Медиатека" subtitle={`${result.totalDocs} файлов`} />

      <div className="rounded-3xl border border-border bg-card p-6">
        <MediaGrid items={result.docs} />

        {result.totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            {page > 1 ? (
              <Link href={`/admin/media?page=${page - 1}`} className="text-[12.5px] font-semibold text-subtle hover:text-foreground">
                ← Раньше
              </Link>
            ) : null}
            <span className="text-[12.5px] text-subtle">
              {page} / {result.totalPages}
            </span>
            {page < result.totalPages ? (
              <Link href={`/admin/media?page=${page + 1}`} className="text-[12.5px] font-semibold text-subtle hover:text-foreground">
                Позже →
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  )
}
