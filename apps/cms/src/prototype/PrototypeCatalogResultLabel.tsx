import { pluralRu } from '../lib/text/plural'

// "N позиций", plus the window when — and only when — N is genuinely a count
// of what is free over that window.
//
// This used to read the selected dates out of stores/dates.ts client-side and
// append "на 12 — 14 сентября" whenever any dates were picked, regardless of
// whether the listing behind the number had been filtered by them. With the
// date-aware "Только свободные" filter restored, that suffix now means
// something specific, so it is rendered from the same `from`/`to` the query
// was actually built with (PrototypeCatalog passes them only when the filter
// ran) rather than from the store. Server-rendered for the same reason: there
// is nothing left here the server does not already know, so the component no
// longer needs to be a client island or carry a hydration gate.
export default function PrototypeCatalogResultLabel({ count, from, to }: { count: number; from?: Date; to?: Date }) {
  const noun = `${count} ${pluralRu(count, 'позиция', 'позиции', 'позиций')}`
  if (!from || !to) return <>{noun}</>
  // Both bounds are formatted through toLocaleDateString rather than a bare
  // { month: 'long' } formatter, which yields the nominative "сентябрь"
  // instead of the genitive "сентября" a date needs.
  const long = (d: Date) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()
  const label = sameMonth ? `${from.getDate()} — ${long(to)}` : `${long(from)} — ${long(to)}`
  return <>{noun} на {label}</>
}
