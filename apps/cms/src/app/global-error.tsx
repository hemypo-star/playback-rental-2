'use client'

// Last-resort boundary for an error in a root layout itself (e.g. the
// storefront layout failing to load site settings). It replaces the whole
// document, so it carries its own minimal markup and styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#EFEEEB', color: '#0A0A0A', fontFamily: 'system-ui, sans-serif' }}>
        <main style={{ maxWidth: 520, padding: 32, borderRadius: 26, background: '#fff', border: '1px solid rgba(10,10,10,.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B6964' }}>Playback Rental</div>
          <h1 style={{ margin: '12px 0 0', fontSize: 30, fontWeight: 500, letterSpacing: '-.03em' }}>Сайт временно недоступен</h1>
          <p style={{ margin: '12px 0 0', lineHeight: 1.5, color: '#4A4844' }}>Попробуйте обновить страницу через минуту. Заявку можно оформить по телефону.</p>
          <button type="button" onClick={reset} style={{ marginTop: 22, height: 48, padding: '0 22px', border: 0, borderRadius: 999, background: '#0A0A0A', color: '#fff', fontSize: 11.5, fontWeight: 600, letterSpacing: '.13em', textTransform: 'uppercase', cursor: 'pointer' }}>
            Обновить
          </button>
        </main>
      </body>
    </html>
  )
}
