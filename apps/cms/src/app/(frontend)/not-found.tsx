import type { Metadata } from 'next'
import Link from 'next/link'

// Rendered inside the storefront layout (header, footer) for notFound() —
// a missing product or category — and, via [...unmatched], for any URL no
// route matches. Before, unknown URLs got Next's bare English 404 and a
// missing product redirected to /catalog with a 307, which search engines
// read as a soft 404.
export const metadata: Metadata = { title: 'Страница не найдена', robots: { index: false } }

export default function NotFound() {
  return (
    <div className="pb-page">
      <section className="pb-container pb-grid" style={{ paddingTop: 14 }}>
        <div className="pb-card pb-page-head">
          <div>
            <div className="pb-kicker">Ошибка 404</div>
            <h1 className="pb-h1" style={{ marginTop: 12 }}>Такой страницы нет</h1>
            <p className="pb-lead">Возможно, технику сняли с&nbsp;проката или&nbsp;ссылка устарела. В&nbsp;каталоге&nbsp;— всё, что можно взять сейчас.</p>
          </div>
          <div className="pb-actions">
            <Link href="/" className="pb-pill pb-btn pb-btn-light">На&nbsp;главную</Link>
            <Link href="/catalog" className="pb-pill pb-btn pb-hero-cta">
              <span>Смотреть каталог</span>
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
