import Link from 'next/link'

// Ported from apps/web/src/layouts/AdminLayout.astro's title-bar block
// (docs/PLAN-next-migration.md Stage 3.2). Astro's AdminLayout took
// title/subtitle/activeTab/actionLabel/actionHref as props from each page —
// Next's shared (admin)/admin/layout.tsx can't receive per-page props the
// same way, so each page renders its own header via this component instead
// of the layout doing it for them. Visual output is identical either way.
interface Props {
  title: string
  subtitle?: string
  actionLabel?: string
  actionHref?: string
}

export default function AdminPageHeader({ title, subtitle, actionLabel, actionHref }: Props) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 rounded-3xl border border-border bg-card px-6.5 py-5.5">
      <div>
        <h1 className="m-0 text-[28px] font-medium tracking-[-0.035em]">{title}</h1>
        {subtitle ? <div className="mt-1.5 text-[12.5px] text-subtle">{subtitle}</div> : null}
      </div>
      {actionLabel ? (
        <Link
          href={actionHref ?? '#'}
          style={{ color: '#fff', transition: 'background 240ms ease, gap 380ms cubic-bezier(0.16,1,0.3,1)' }}
          className="flex h-[42px] items-center gap-3 rounded-full bg-primary px-5 text-[11px] font-semibold tracking-[0.1em] uppercase hover:gap-5 hover:bg-accent"
        >
          <span>{actionLabel}</span>
          <span>+</span>
        </Link>
      ) : null}
    </div>
  )
}
