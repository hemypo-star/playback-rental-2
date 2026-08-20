import type { Metadata } from 'next'

// Ported from apps/web/src/pages/how-it-works.astro (docs/PLAN-next-
// migration.md Stage 2, page group 2). Pure static markup, no data fetching
// — the steps/pricing/FAQ arrays are hardcoded in the Astro source too, not
// pulled from SiteSettings (that's the *homepage* howItWorksSteps, a
// different, shorter list used in a different place — see page group 3).
export const metadata: Metadata = { title: 'Как это работает' }

const steps = [
  { title: 'Просмотрите каталог', body: 'Ознакомьтесь с ассортиментом техники. Отфильтруйте по категориям или найдите конкретную позицию поиском.' },
  { title: 'Проверьте наличие', body: 'На странице товара сразу видно, свободна ли техника на выбранные даты.' },
  { title: 'Выберите период аренды', body: 'От 4 часов до нескольких недель. Чем дольше срок — тем выгоднее ставка за сутки.' },
  { title: 'Оставьте заявку', body: 'Укажите имя, email и телефон — без регистрации. Менеджер свяжется, чтобы подтвердить бронь. Для аренды нужен паспорт РФ.' },
  { title: 'Заберите оборудование', body: 'Приезжайте по адресу, получите технику и короткий инструктаж. Проверьте комплектацию на месте.' },
  { title: 'Снимайте', body: 'Используйте технику для проекта. При необходимости — на связи для технической поддержки.' },
  { title: 'Верните вовремя', body: 'В оговорённый срок и в опрятном состоянии. При просрочке более часа начисляется ещё одни сутки аренды.' },
]

const pricing = [
  { title: 'Единая ставка за сутки', text: 'Цена на странице товара — это цена за одни сутки аренды, без скрытых надбавок.' },
  { title: 'Любой период до 24 часов — одни сутки', text: 'Даже если техника нужна на несколько часов, оплата — как за полные сутки.' },
  { title: 'Несколько суток — считаем по дням', text: 'Стоимость за более длительный срок — это дневная ставка, умноженная на число суток.' },
]

const faq = [
  { q: 'Что если я верну технику позже срока?', a: 'Поздний возврат оплачивается по суточному тарифу. Если нужно продлить аренду — свяжитесь с нами заранее, часто это можно сделать со скидкой.' },
  { q: 'Какой документ нужен для аренды?', a: 'Паспорт гражданина РФ. Для юридических лиц может потребоваться дополнительный пакет документов.' },
]

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-border py-16">
        <div className="container-page">
          <h1 className="text-[38px] font-bold tracking-[-0.03em]">Как мы работаем</h1>
          <p className="mt-4 max-w-[560px] text-[15.5px] leading-[1.55] text-muted-foreground">
            Аренда профессиональной техники — простой процесс из семи шагов, от каталога до возврата оборудования.
          </p>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mx-auto grid max-w-[720px] gap-8">
          {steps.map((step, i) => (
            <div key={step.title} className="flex gap-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-primary-foreground">
                {i + 1}
              </div>
              <div>
                <div className="text-[16px] font-semibold tracking-[-0.015em]">{step.title}</div>
                <p className="mt-1.5 text-[14px] leading-[1.55] text-muted-foreground">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-muted py-16">
        <div className="container-page">
          <div className="text-center">
            <h2 className="text-[30px] font-bold tracking-[-0.03em]">Как считается цена</h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[14.5px] text-muted-foreground">
              Просто и без сюрпризов — точную сумму на ваши даты всегда видно в корзине до отправки заявки.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-[820px] grid-cols-1 gap-4 sm:grid-cols-3">
            {pricing.map((p) => (
              <div key={p.title} className="card-surface p-5 text-center">
                <div className="text-[16px] font-semibold">{p.title}</div>
                <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16">
        <div className="mx-auto max-w-[720px]">
          <h2 className="text-center text-[30px] font-bold tracking-[-0.03em]">Частые вопросы</h2>
          <div className="mt-10 space-y-4">
            {faq.map((item) => (
              <div key={item.q} className="card-surface p-5">
                <div className="text-[15px] font-semibold">{item.q}</div>
                <p className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-primary py-16 text-center text-primary-foreground">
        <div className="container-page">
          <h2 className="text-[28px] font-bold tracking-[-0.03em]">Готовы арендовать оборудование?</h2>
          <a href="/catalog" className="btn-primary mt-6 inline-flex h-12 bg-white px-7 text-[14.5px] text-primary hover:bg-white/90">
            Смотреть каталог
          </a>
        </div>
      </section>
    </>
  )
}
