import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMetadata } from '../../../lib/seo'
import { MAX_RENTAL_DAYS } from '../../../lib/rental/limits'

// S5 "Как это работает" (design_handoff_swiss_bento/04-screens.md): head card →
// four steps 3+3+3+3 (big muted number, 18px title, 14px text) → pricing →
// FAQ accordion → dark CTA. The copy is the same as the page's earlier
// seven-step version, grouped into the four stages a customer actually goes
// through. Static on purpose: the homepage's shorter steps are the editable
// ones (SiteSettings.howItWorksSteps).
//
// force-dynamic: this page itself has no DB read, but the shared layout's
// Footer does (getSiteSettings()) — a genuine `next build`'s static-
// generation pass executes it for real, which fails in Docker's build
// stage (no live DATABASE_URI there — see apps/cms/Dockerfile).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildMetadata({ title: 'Как мы работаем', path: '/how-it-works' })

const steps = [
  {
    title: 'Выберите технику',
    text: 'Найдите позицию в каталоге по разделу или поиском. На странице товара сразу видно, свободна ли техника на ваши даты.',
  },
  {
    title: 'Оставьте заявку',
    text: `Укажите даты — от 4 часов до ${MAX_RENTAL_DAYS} суток — и контакты, без регистрации. Менеджер перезвонит и подтвердит бронь.`,
  },
  {
    title: 'Заберите и снимайте',
    text: 'Приезжайте с паспортом РФ, получите технику и короткий инструктаж, проверьте комплектацию. На связи, если что-то понадобится на съёмке.',
  },
  {
    title: 'Верните вовремя',
    text: 'В оговорённый срок и в опрятном состоянии. Просрочка больше часа — это ещё одни сутки аренды.',
  },
]

const pricing = [
  { kicker: 'Ставка', title: 'Единая цена за сутки', text: 'Цена на странице товара — за одни сутки аренды, без скрытых надбавок.' },
  { kicker: 'До 24 часов', title: 'Считается как сутки', text: 'Даже если техника нужна на несколько часов, оплата — как за полные сутки.' },
  { kicker: 'Дольше', title: 'Ставка × число суток', text: 'Каждые начатые 24 часа — ещё одни сутки по той же дневной ставке.' },
  { kicker: 'Скидка 5%', title: 'За сторис или отзыв', text: 'Отметьте нас в сторис или оставьте отзыв в 2ГИС — скажите об этом при получении.' },
]

const faq = [
  {
    q: 'Что если я верну технику позже срока?',
    a: 'Поздний возврат оплачивается по суточному тарифу. Если нужно продлить аренду — свяжитесь с нами заранее, часто это можно сделать на выгодных условиях.',
  },
  {
    q: 'Какой документ нужен для аренды?',
    a: 'Паспорт гражданина РФ. Для юридических лиц может потребоваться дополнительный пакет документов.',
  },
  {
    q: 'На какой срок можно арендовать?',
    a: `От 4 часов до ${MAX_RENTAL_DAYS} суток в одной заявке. Для более долгой аренды напишите нам — договоримся.`,
  },
  {
    q: 'Можно ли взять набор и отдельно ещё технику?',
    a: 'Да. Наборы и отдельные позиции бронируются вместе, пока техники хватает на ваши даты — корзина сразу покажет, если чего-то недостаточно.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="pb-page">
      <section className="pb-container pb-grid" style={{ paddingTop: 14 }}>
        <div className="pb-card pb-page-head">
          <div>
            <div className="pb-kicker">
              <Link href="/" className="pb-link-hover">Главная</Link> / Как мы работаем
            </div>
            <h1 className="pb-h1" style={{ marginTop: 12 }}>Как мы работаем</h1>
            <p className="pb-lead">Аренда профессиональной техники в четыре шага — от каталога до возврата.</p>
          </div>
          <Link href="/catalog" className="pb-pill pb-btn pb-hero-cta">
            <span>Смотреть каталог</span>
            <span aria-hidden>→</span>
          </Link>
        </div>

        {steps.map((step, i) => (
          <div key={step.title} className="pb-card pb-info-step" style={{ animationDelay: `${0.06 * (i + 1)}s` }}>
            <span className="pb-info-step-n">{String(i + 1).padStart(2, '0')}</span>
            <div className="pb-info-step-title">{step.title}</div>
            <p className="pb-info-step-text">{step.text}</p>
          </div>
        ))}

        <div className="pb-section-head">
          <div>
            <div className="pb-kicker">Цена</div>
            <h2 className="pb-h2">Как считается стоимость</h2>
          </div>
          <p className="pb-lead" style={{ maxWidth: 420, margin: 0 }}>
            Точную сумму на ваши даты корзина показывает до отправки заявки.
          </p>
        </div>
        {pricing.map((p) => (
          <div key={p.title} className="pb-price-card">
            <div className="pb-kicker">{p.kicker}</div>
            <div className="pb-price-card-title">{p.title}</div>
            <p className="pb-price-card-text">{p.text}</p>
          </div>
        ))}

        <div className="pb-section-head">
          <div>
            <div className="pb-kicker">Вопросы</div>
            <h2 className="pb-h2">Частые вопросы</h2>
          </div>
        </div>
        <div className="pb-card pb-faq">
          {faq.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>

        <div className="pb-dark-contact" style={{ marginBottom: 0 }}>
          <div>
            <div className="pb-kicker" style={{ color: 'rgba(255,255,255,.5)' }}>Готовы?</div>
            <div style={{ marginTop: 16, fontSize: 'clamp(26px,3.2vw,44px)', fontWeight: 500, letterSpacing: '-.04em', lineHeight: 1.02 }}>
              Выберите технику на свои даты
            </div>
            <p style={{ marginTop: 16, fontSize: 14.5, lineHeight: 1.55, color: 'rgba(255,255,255,.62)', maxWidth: 420 }}>
              Наличие видно сразу, бронь подтверждает менеджер.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 10 }}>
            <Link href="/catalog" className="pb-pill pb-btn pb-contact-cta">
              <span>Смотреть каталог</span>
              <span className="pb-contact-icon">→</span>
            </Link>
            <Link href="/contact" className="pb-pill pb-btn" style={{ background: 'rgba(255,255,255,.1)' }}>
              Задать вопрос
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
