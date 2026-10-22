'use client'

import Link from 'next/link'
import { useEffect } from 'react'

// Storefront error boundary: a failing page keeps the site's header and
// footer and offers a retry, instead of Next's bare error screen. The error
// itself is reported by instrumentation.ts (onRequestError) on the server.
export default function StorefrontError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="pb-page">
      <section className="pb-container pb-grid" style={{ paddingTop: 14 }}>
        <div className="pb-card pb-page-head">
          <div>
            <div className="pb-kicker">Ошибка</div>
            <h1 className="pb-h1" style={{ marginTop: 12 }}>Что-то пошло не&nbsp;так</h1>
            <p className="pb-lead">
              Страница не&nbsp;загрузилась. Попробуйте ещё раз&nbsp;— если&nbsp;не&nbsp;выйдет, позвоните нам, и&nbsp;мы&nbsp;оформим заявку по&nbsp;телефону.
            </p>
          </div>
          <div className="pb-actions">
            <Link href="/" className="pb-pill pb-btn pb-btn-light">На&nbsp;главную</Link>
            <button type="button" onClick={reset} className="pb-pill pb-btn pb-hero-cta">
              <span>Попробовать снова</span>
              <span aria-hidden>↻</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
