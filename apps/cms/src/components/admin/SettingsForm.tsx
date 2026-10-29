'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/settings.astro
// (docs/PLAN-next-migration.md Stage 3.4/3.5) — same fields, same save
// behavior, as React state instead of raw DOM reads. Sections are named after
// WHERE they show on the site and anchored (#hero, #facts, #steps, #cta,
// #contacts, #hours) so the /admin → Контент hub can link straight to them;
// field labels say what the text is, with a hint and the current storefront
// fallback as placeholder, instead of jargon like "Кикер".
import { useId, useState, type ReactNode } from 'react'
import Image from 'next/image'
import type { Category, Product, SiteSetting } from '../../payload-types'
import { mediaUrl } from '../../lib/mediaUrl'
import { uploadMedia } from '../../lib/admin/mediaUpload'
import ImageDropzone from './ImageDropzone'
import { saveSiteSettings } from '../../app/(admin)/admin/settings/actions'
import { DEFAULT_BUSINESS_HOURS } from '../../lib/businessHours'

interface Step {
  title: string
  text: string
}

function imageId(value: SiteSetting['heroBannerImage']): number | null {
  return typeof value === 'object' && value ? value.id : (value ?? null)
}

const SECTIONS = [
  { id: 'hero', title: 'Первый экран главной' },
  { id: 'categories', title: 'Категории на главной' },
  { id: 'popular', title: 'Популярные товары' },
  { id: 'facts', title: 'Цифры под первым экраном' },
  { id: 'steps', title: 'Шаги «Как это работает»' },
  { id: 'cta', title: 'Блок «Нужен совет»' },
  { id: 'contacts', title: 'Контакты' },
  { id: 'hours', title: 'Часы работы' },
]

function SectionHead({ title, where }: { title: string; where: string }) {
  return (
    <div>
      <h2 className="pb-settings-section-title">{title}</h2>
      <div className="pb-settings-section-where">{where}</div>
    </div>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <label htmlFor={id} className="block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">
        {label}
      </label>
      {children}
      {hint && <span className="pb-settings-hint">{hint}</span>}
    </div>
  )
}

export default function SettingsForm({
  settings,
  categories = [],
  products = [],
}: {
  settings: SiteSetting
  categories?: Category[]
  products?: Product[]
}) {
  const uid = useId()
  const rawFeatured = 'featuredCategories' in settings ? (settings as { featuredCategories?: unknown }).featuredCategories : undefined
  const initialFeatured: number[] = Array.isArray(rawFeatured) ? rawFeatured.filter((id): id is number => typeof id === 'number') : []
  const [featuredCategoryIds, setFeaturedCategoryIds] = useState<number[]>(initialFeatured)
  const rawFeaturedProducts = 'featuredProducts' in settings ? (settings as { featuredProducts?: unknown }).featuredProducts : undefined
  const initialFeaturedProducts: number[] = Array.isArray(rawFeaturedProducts) ? rawFeaturedProducts.filter((id): id is number => typeof id === 'number') : []
  const [featuredProductIds, setFeaturedProductIds] = useState<number[]>(initialFeaturedProducts)
  const [productSearch, setProductSearch] = useState('')
  const [heroDesktopId, setHeroDesktopId] = useState<number | null>(imageId(settings.heroBannerImage))
  const [heroDesktopPreview, setHeroDesktopPreview] = useState<string | undefined>(mediaUrl(settings.heroBannerImage))
  const [heroMobileId, setHeroMobileId] = useState<number | null>(imageId(settings.heroBannerImageMobile))
  const [heroMobilePreview, setHeroMobilePreview] = useState<string | undefined>(mediaUrl(settings.heroBannerImageMobile))
  const [heroKicker, setHeroKicker] = useState(settings.heroKicker ?? '')
  const [heroCity, setHeroCity] = useState(settings.heroCity ?? '')
  const [heroHeadline, setHeroHeadline] = useState(settings.heroHeadline ?? '')
  const [heroSubtext, setHeroSubtext] = useState(settings.heroSubtext ?? '')
  const [depositLabel, setDepositLabel] = useState(settings.depositLabel ?? '')
  const [depositCaption, setDepositCaption] = useState(settings.depositCaption ?? '')
  const [pickupTimeLabel, setPickupTimeLabel] = useState(settings.pickupTimeLabel ?? '')
  const [pickupTimeCaption, setPickupTimeCaption] = useState(settings.pickupTimeCaption ?? '')
  const [steps, setSteps] = useState<Step[]>((settings.howItWorksSteps ?? []).map((s) => ({ title: s.title, text: s.text })))
  const [ctaKicker, setCtaKicker] = useState(settings.ctaKicker ?? '')
  const [ctaHeadline, setCtaHeadline] = useState(settings.ctaHeadline ?? '')
  const [ctaSubtext, setCtaSubtext] = useState(settings.ctaSubtext ?? '')
  const [contactPhone, setContactPhone] = useState(settings.contactPhone ?? '')
  const [contactEmail, setContactEmail] = useState(settings.contactEmail ?? '')
  const [contactTelegram, setContactTelegram] = useState(settings.contactTelegram ?? '')
  const [contactTelegramUrl, setContactTelegramUrl] = useState(settings.contactTelegramUrl ?? '')
  const [contactVkUrl, setContactVkUrl] = useState(settings.contactVkUrl ?? '')
  const [contactAddress, setContactAddress] = useState(settings.contactAddress ?? '')
  const [contactHours, setContactHours] = useState(settings.contactHours ?? '')
  // B4 (design_handoff_swiss_bento/08-instruction.md, audit N5) — numeric,
  // separate from the free-text contactHours above (that one is prose for
  // display, e.g. could read "Пн–Вс 10:00–21:00"; these two feed the rental
  // date/time picker's actual grid and can't be parsed out of prose safely).
  // Falls back to DEFAULT_BUSINESS_HOURS only for a genuinely-missing value
  // (the schema's own defaultValue means that's normally unreachable).
  const [businessHoursOpen, setBusinessHoursOpen] = useState(settings.businessHoursOpen ?? DEFAULT_BUSINESS_HOURS.open)
  const [businessHoursClose, setBusinessHoursClose] = useState(settings.businessHoursClose ?? DEFAULT_BUSINESS_HOURS.close)
  const [yandexMapsUrl, setYandexMapsUrl] = useState(settings.yandexMapsUrl ?? '')
  const [twoGisUrl, setTwoGisUrl] = useState(settings.twoGisUrl ?? '')

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleHeroUpload = async (files: File[], which: 'desktop' | 'mobile') => {
    // Single-image slot: last dropped/picked file wins.
    const file = files[files.length - 1]
    if (!file) return
    try {
      const media = await uploadMedia(file)
      if (which === 'desktop') {
        setHeroDesktopId(media.id)
        setHeroDesktopPreview(media.url)
      } else {
        setHeroMobileId(media.id)
        setHeroMobilePreview(media.url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить файл')
    }
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(false)
    setSaving(true)
    const result = await saveSiteSettings({
      heroBannerImage: heroDesktopId,
      heroBannerImageMobile: heroMobileId,
      featuredCategories: featuredCategoryIds,
      featuredProducts: featuredProductIds,
      heroKicker,
      heroCity,
      heroHeadline,
      heroSubtext,
      depositLabel,
      depositCaption,
      pickupTimeLabel,
      pickupTimeCaption,
      howItWorksSteps: steps.map((s) => ({ title: s.title.trim(), text: s.text.trim() })).filter((s) => s.title && s.text),
      ctaKicker,
      ctaHeadline,
      ctaSubtext,
      contactPhone,
      contactEmail,
      contactTelegram,
      contactTelegramUrl,
      contactVkUrl,
      contactAddress,
      contactHours,
      businessHoursOpen,
      businessHoursClose,
      yandexMapsUrl,
      twoGisUrl,
    })
    setSaving(false)
    if (!result.success) {
      setError(result.error || 'Не удалось сохранить')
      return
    }
    setSuccess(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white'
  const textareaClass = 'mt-1.5 w-full resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground focus:bg-white'
  const sectionClass = 'pb-settings-section rounded-3xl border border-border bg-card p-6'

  return (
    <>
      {error && <p className="rounded-2xl bg-status-alert-bg px-4 py-3 text-[13px] text-status-alert">{error}</p>}
      {success && <p className="rounded-2xl bg-status-ok-bg px-4 py-3 text-[13px] text-status-ok">Сохранено — изменения уже на сайте.</p>}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <section id="hero" className={sectionClass}>
            <SectionHead title="Первый экран главной" where="Большой блок вверху главной: строка над заголовком, заголовок, текст и картинка." />

            <div className="mt-4 flex flex-wrap gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Картинка — компьютер</div>
                {/* C4 (design_handoff_swiss_bento/08-instruction.md, G3):
                    fixed 80x96 admin thumbnails — same reasoning as
                    CategoryForm/PromotionForm's own previews. */}
                {heroDesktopPreview ? <Image src={heroDesktopPreview} width={80} height={96} className="mt-1.5 rounded-xl bg-muted object-cover" alt="" /> : null}
                <ImageDropzone multiple={false} onFiles={(files) => handleHeroUpload(files, 'desktop')} label="+ Загрузить" hint="справа от заголовка; перетащите файл или нажмите" className="mt-1.5 w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Картинка — телефон</div>
                {heroMobilePreview ? <Image src={heroMobilePreview} width={80} height={96} className="mt-1.5 rounded-xl bg-muted object-cover" alt="" /> : null}
                <ImageDropzone multiple={false} onFiles={(files) => handleHeroUpload(files, 'mobile')} label="+ Загрузить" hint="над заголовком на телефоне" className="mt-1.5 w-full" />
              </div>
            </div>

            <Field id={`${uid}-hero-kicker`} label="Строка над заголовком" hint="Маленькие заглавные буквы слева вверху.">
              <input id={`${uid}-hero-kicker`} value={heroKicker} onChange={(e) => setHeroKicker(e.target.value)} placeholder="Прокат съёмочной техники" className={inputClass} />
            </Field>
            <Field id={`${uid}-hero-city`} label="Город" hint="Плашка справа от строки над заголовком.">
              <input id={`${uid}-hero-city`} value={heroCity} onChange={(e) => setHeroCity(e.target.value)} placeholder="Кемерово" className={inputClass} />
            </Field>
            <Field id={`${uid}-hero-headline`} label="Заголовок" hint="Самый крупный текст сайта — коротко, в одну-две строки.">
              <input id={`${uid}-hero-headline`} value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} placeholder="Прокат техники для съёмки" className={inputClass} />
            </Field>
            <Field id={`${uid}-hero-subtext`} label="Текст под заголовком">
              <textarea id={`${uid}-hero-subtext`} rows={2} value={heroSubtext} onChange={(e) => setHeroSubtext(e.target.value)} placeholder="Камеры, объективы, свет, звук и аксессуары…" className={textareaClass} />
            </Field>
          </section>

          <section id="categories" className={sectionClass}>
            <SectionHead
              title="Категории на главной"
              where="Плитки разделов в блоке «Выберите, чем снимать». Рекомендуется выбрать 6 категорий. Если список пуст, автоматически показываются первые 6 активных категорий."
            />
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle mb-2">
                Выбранные категории (в порядке показа на главной): {featuredCategoryIds.length}
              </div>
              {featuredCategoryIds.length === 0 ? (
                <div className="rounded-xl border border-dashed border-input p-4 text-[13px] text-subtle">
                  Сейчас категории не выбраны вручную — на главной показываются первые 6 активных категорий по умолчанию.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {featuredCategoryIds.map((id, index) => {
                    const cat = categories.find((c) => c.id === id)
                    if (!cat) return null
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 rounded-xl bg-muted p-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 text-center text-[12px] font-semibold text-subtle">{index + 1}</span>
                          <span className="text-[14px] font-medium text-foreground">{cat.name}</span>
                          {cat.tag && (
                            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-subtle">
                              {cat.tag}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const next = [...featuredCategoryIds]
                              const temp = next[index - 1]
                              next[index - 1] = next[index]
                              next[index] = temp
                              setFeaturedCategoryIds(next)
                            }}
                            className="h-7 w-7 rounded-lg bg-white text-[12px] text-subtle hover:text-foreground disabled:opacity-30"
                            title="Поднять выше"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === featuredCategoryIds.length - 1}
                            onClick={() => {
                              const next = [...featuredCategoryIds]
                              const temp = next[index + 1]
                              next[index + 1] = next[index]
                              next[index] = temp
                              setFeaturedCategoryIds(next)
                            }}
                            className="h-7 w-7 rounded-lg bg-white text-[12px] text-subtle hover:text-foreground disabled:opacity-30"
                            title="Опустить ниже"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeaturedCategoryIds(featuredCategoryIds.filter((cid) => cid !== id))}
                            className="h-7 w-7 rounded-lg bg-white text-[12px] text-subtle hover:text-status-alert"
                            title="Убрать с главной"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="mt-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle mb-2">
                Добавить категорию на главную:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-input bg-muted-well p-2.5">
                {categories
                  .filter((c) => !featuredCategoryIds.includes(c.id))
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFeaturedCategoryIds([...featuredCategoryIds, c.id])}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1 text-[12.5px] font-medium text-foreground hover:border-foreground hover:bg-muted"
                    >
                      <span>+</span>
                      <span>{c.name}</span>
                      {c.tag && <span className="text-[10px] text-subtle">({c.tag})</span>}
                    </button>
                  ))}
              </div>
            </div>
          </section>

          <section id="popular" className={sectionClass}>
            <SectionHead
              title="Популярные товары на главной"
              where="Карточки в блоке «Берут чаще всего / Популярные позиции» на главной странице. Рекомендуется 4 товара. Если список пуст, автоматически выбираются 4 самые популярные позиции по истории заказов."
            />
            <div className="mt-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle mb-2">
                Выбранные позиции (в порядке показа на главной): {featuredProductIds.length}
              </div>
              {featuredProductIds.length === 0 ? (
                <div className="rounded-xl border border-dashed border-input p-4 text-[13px] text-subtle">
                  Сейчас позиции не выбраны вручную — на главной показываются 4 самые популярные позиции по истории заказов.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {featuredProductIds.map((id, index) => {
                    const p = products.find((prod) => prod.id === id)
                    if (!p) return null
                    return (
                      <div key={id} className="flex items-center justify-between gap-3 rounded-xl bg-muted p-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 text-center text-[12px] font-semibold text-subtle shrink-0">{index + 1}</span>
                          <span className="text-[14px] font-medium text-foreground truncate">{p.title}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-subtle shrink-0">
                            {p.price} ₽
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => {
                              const next = [...featuredProductIds]
                              const temp = next[index - 1]
                              next[index - 1] = next[index]
                              next[index] = temp
                              setFeaturedProductIds(next)
                            }}
                            className="h-7 w-7 rounded-lg bg-white text-[12px] text-subtle hover:text-foreground disabled:opacity-30"
                            title="Поднять выше"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={index === featuredProductIds.length - 1}
                            onClick={() => {
                              const next = [...featuredProductIds]
                              const temp = next[index + 1]
                              next[index + 1] = next[index]
                              next[index] = temp
                              setFeaturedProductIds(next)
                            }}
                            className="h-7 w-7 rounded-lg bg-white text-[12px] text-subtle hover:text-foreground disabled:opacity-30"
                            title="Опустить ниже"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => setFeaturedProductIds(featuredProductIds.filter((pid) => pid !== id))}
                            className="h-7 w-7 rounded-lg bg-white text-[12px] text-subtle hover:text-status-alert"
                            title="Убрать с главной"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle mb-2">
                Добавить товар в популярные:
              </div>
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Поиск по названию товара..."
                className="mb-2 h-9 w-full rounded-xl border border-input bg-muted-well px-3 text-[13px] outline-none focus:border-foreground focus:bg-white"
              />
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto rounded-xl border border-input bg-muted-well p-2.5">
                {products
                  .filter((p) => !featuredProductIds.includes(p.id) && (!productSearch || p.title.toLowerCase().includes(productSearch.toLowerCase())))
                  .slice(0, 30)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFeaturedProductIds([...featuredProductIds, p.id])}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1 text-[12px] font-medium text-foreground hover:border-foreground hover:bg-muted"
                    >
                      <span>+</span>
                      <span className="truncate max-w-xs">{p.title}</span>
                      <span className="text-[10.5px] text-subtle">({p.price} ₽)</span>
                    </button>
                  ))}
              </div>
            </div>
          </section>
          <section id="facts" className={sectionClass}>
            <SectionHead title="Цифры под первым экраном" where="Две карточки в ряду под первым экраном главной: крупное значение и подпись под ним." />
            <div className="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
              <Field id={`${uid}-deposit-label`} label="Карточка 1 — значение">
                <input id={`${uid}-deposit-label`} value={depositLabel} onChange={(e) => setDepositLabel(e.target.value)} placeholder="0 ₽" className={inputClass} />
              </Field>
              <Field id={`${uid}-deposit-caption`} label="Карточка 1 — подпись">
                <input id={`${uid}-deposit-caption`} value={depositCaption} onChange={(e) => setDepositCaption(e.target.value)} placeholder="Залог" className={inputClass} />
              </Field>
              <Field id={`${uid}-pickup-time-label`} label="Карточка 2 — значение">
                <input id={`${uid}-pickup-time-label`} value={pickupTimeLabel} onChange={(e) => setPickupTimeLabel(e.target.value)} placeholder="10 мин" className={inputClass} />
              </Field>
              <Field id={`${uid}-pickup-time-caption`} label="Карточка 2 — подпись">
                <input id={`${uid}-pickup-time-caption`} value={pickupTimeCaption} onChange={(e) => setPickupTimeCaption(e.target.value)} placeholder="Выдача по паспорту" className={inputClass} />
              </Field>
            </div>
          </section>

          <section id="steps" className={sectionClass}>
            <SectionHead
              title="Шаги «Как это работает»"
              where="Короткие шаги на главной. Пустой шаг не сохраняется. Подробная страница «Как мы работаем» — отдельная."
            />
            <div className="mt-4 flex flex-col gap-2.5">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2 rounded-xl bg-muted p-2.5">
                  <span className="w-6 shrink-0 pt-2 text-center text-[12px] font-semibold text-subtle">{i + 1}</span>
                  <div className="flex-1">
                    <input
                      value={s.title}
                      onChange={(e) => setSteps((prev) => prev.map((v, idx) => (idx === i ? { ...v, title: e.target.value } : v)))}
                      aria-label={`Шаг ${i + 1}: заголовок`}
                      placeholder="Заголовок шага — например, «Выбираете технику»"
                      className="h-9 w-full rounded-lg border border-input bg-white px-2.5 text-[13px] outline-none focus:border-foreground"
                    />
                    <input
                      value={s.text}
                      onChange={(e) => setSteps((prev) => prev.map((v, idx) => (idx === i ? { ...v, text: e.target.value } : v)))}
                      aria-label={`Шаг ${i + 1}: текст`}
                      placeholder="Одно предложение пояснения"
                      className="mt-1.5 h-9 w-full rounded-lg border border-input bg-white px-2.5 text-[13px] outline-none focus:border-foreground"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Удалить шаг ${i + 1}`}
                    className="w-8 shrink-0 self-start rounded-lg bg-white text-[13px] text-subtle hover:text-accent"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setSteps((prev) => [...prev, { title: '', text: '' }])} className="mt-3 text-[12.5px] font-semibold text-subtle hover:text-foreground">
              + Добавить шаг
            </button>
          </section>

          <section id="cta" className={sectionClass}>
            <SectionHead title="Блок «Нужен совет»" where="Тёмный блок внизу главной, рядом с телефоном и адресом. Пустое поле — показывается текст по умолчанию." />
            <Field id={`${uid}-cta-kicker`} label="Строка над заголовком">
              <input id={`${uid}-cta-kicker`} value={ctaKicker} onChange={(e) => setCtaKicker(e.target.value)} placeholder="Нужен совет" className={inputClass} />
            </Field>
            <Field id={`${uid}-cta-headline`} label="Заголовок">
              <input id={`${uid}-cta-headline`} value={ctaHeadline} onChange={(e) => setCtaHeadline(e.target.value)} placeholder="Не знаете, что взять на съёмку?" className={inputClass} />
            </Field>
            <Field id={`${uid}-cta-subtext`} label="Текст">
              <textarea
                id={`${uid}-cta-subtext`}
                rows={2}
                value={ctaSubtext}
                onChange={(e) => setCtaSubtext(e.target.value)}
                placeholder="Опишите задачу — соберём комплект под неё и посчитаем стоимость на ваши даты."
                className={textareaClass}
              />
            </Field>
          </section>

          <section id="contacts" className={sectionClass}>
            <SectionHead title="Контакты" where="Подвал всех страниц, страница «Контакты» и тёмный блок на главной." />
            <div className="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
              <Field id={`${uid}-contact-phone`} label="Телефон">
                <input id={`${uid}-contact-phone`} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+7 (996) 527-0026" className={inputClass} />
              </Field>
              <Field id={`${uid}-contact-email`} label="Почта">
                <input id={`${uid}-contact-email`} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="PlaybackRental@yandex.ru" className={inputClass} />
              </Field>
              <Field id={`${uid}-contact-telegram`} label="Telegram — как подписать" hint="Текст, который видит клиент, например @Playbackrental_admin.">
                <input id={`${uid}-contact-telegram`} value={contactTelegram} onChange={(e) => setContactTelegram(e.target.value)} placeholder="@Playbackrental_admin" className={inputClass} />
              </Field>
              <Field id={`${uid}-contact-telegram-url`} label="Telegram — ссылка" hint="Куда ведёт кнопка «Telegram».">
                <input id={`${uid}-contact-telegram-url`} value={contactTelegramUrl} onChange={(e) => setContactTelegramUrl(e.target.value)} placeholder="https://t.me/Playbackrental_admin" className={inputClass} />
              </Field>
              <Field id={`${uid}-contact-vk-url`} label="ВКонтакте — ссылка">
                <input id={`${uid}-contact-vk-url`} value={contactVkUrl} onChange={(e) => setContactVkUrl(e.target.value)} placeholder="https://vk.com/playbackrental" className={inputClass} />
              </Field>
              <Field id={`${uid}-contact-address`} label="Адрес">
                <input id={`${uid}-contact-address`} value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} placeholder="г. Кемерово, ул. Демьяна Бедного, 6, офис 33" className={inputClass} />
              </Field>
              <Field id={`${uid}-yandex-maps-url`} label="Яндекс.Карты — ссылка" hint="Кнопка «Яндекс.Карты» на странице «Контакты» и в подвале.">
                <input id={`${uid}-yandex-maps-url`} value={yandexMapsUrl} onChange={(e) => setYandexMapsUrl(e.target.value)} placeholder="https://yandex.ru/maps/-/…" className={inputClass} />
              </Field>
              <Field id={`${uid}-two-gis-url`} label="2ГИС — ссылка">
                <input id={`${uid}-two-gis-url`} value={twoGisUrl} onChange={(e) => setTwoGisUrl(e.target.value)} placeholder="https://go.2gis.com/…" className={inputClass} />
              </Field>
            </div>
          </section>

          <section id="hours" className={sectionClass}>
            <SectionHead
              title="Часы работы"
              where="Текст — как часы написаны на сайте. Часы открытия и закрытия — по ним календарь бронирования предлагает время выдачи и возврата. Меняйте их вместе."
            />
            <Field id={`${uid}-contact-hours`} label="Как написать на сайте" hint="Например «10:00 — 21:00» или «Пн–Вс 10:00–21:00».">
              <input id={`${uid}-contact-hours`} value={contactHours} onChange={(e) => setContactHours(e.target.value)} placeholder="10:00 — 21:00" className={inputClass} />
            </Field>
            <div className="grid grid-cols-1 gap-x-3.5 sm:grid-cols-2">
              <Field id={`${uid}-business-hours-open`} label="Открываемся в (час)" hint="Число от 0 до 23. Раньше этого часа забрать технику нельзя.">
                <input
                  id={`${uid}-business-hours-open`}
                  type="number"
                  min={0}
                  max={23}
                  value={businessHoursOpen}
                  onChange={(e) => setBusinessHoursOpen(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field id={`${uid}-business-hours-close`} label="Закрываемся в (час)" hint="Число от 0 до 23. Позже этого часа вернуть технику нельзя.">
                <input
                  id={`${uid}-business-hours-close`}
                  type="number"
                  min={0}
                  max={23}
                  value={businessHoursClose}
                  onChange={(e) => setBusinessHoursClose(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="sticky top-3.5 rounded-3xl border border-border bg-card p-6">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? 'Сохраняем…' : 'Сохранить изменения'}
            </button>
            <p className="pb-settings-hint" style={{ marginTop: 10 }}>
              Сохраняется вся форма сразу. Изменения появятся на сайте сразу после сохранения.
            </p>
            <nav className="pb-settings-toc" aria-label="Разделы настроек">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`}>
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}
