'use client'

// Ported from the inline <script> in apps/web/src/pages/admin/settings.astro
// (docs/PLAN-next-migration.md Stage 3.4/3.5) — same fields, same save
// behavior, as React state instead of raw DOM reads. All four SiteSettings
// sections stacked as sections rather than real tab UI (same simplification
// the Astro source itself already made, per the 2026-08-14 dev log's Step 7
// entry — "simpler to build reliably, still fully functional").
import { useId, useState } from 'react'
import Image from 'next/image'
import type { SiteSetting } from '../../payload-types'
import { mediaUrl } from '../../lib/mediaUrl'
import { uploadMedia } from '../../lib/admin/mediaUpload'
import { saveSiteSettings } from '../../app/(admin)/admin/settings/actions'
import { DEFAULT_BUSINESS_HOURS } from '../../lib/businessHours'

interface Step {
  title: string
  text: string
}

function imageId(value: SiteSetting['heroBannerImage']): number | null {
  return typeof value === 'object' && value ? value.id : (value ?? null)
}

export default function SettingsForm({ settings }: { settings: SiteSetting }) {
  const uid = useId()
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

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>, which: 'desktop' | 'mobile') => {
    const file = e.target.files?.[0]
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
  const labelClass = 'mt-4 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle'

  return (
    <>
      {error && <p className="rounded-2xl bg-status-alert-bg px-4 py-3 text-[13px] text-status-alert">{error}</p>}
      {success && <p className="rounded-2xl bg-status-ok-bg px-4 py-3 text-[13px] text-status-ok">Сохранено.</p>}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Главная — герой</div>

            <div className="mt-3 flex flex-wrap gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-subtle">Десктоп</div>
                {/* C4 (design_handoff_swiss_bento/08-instruction.md, G3):
                    fixed 80x96 admin thumbnails — same reasoning as
                    CategoryForm/PromotionForm's own previews. */}
                {heroDesktopPreview ? <Image src={heroDesktopPreview} width={80} height={96} className="mt-1 rounded-xl bg-muted object-cover" alt="" /> : null}
                <input type="file" accept="image/*" aria-label="Баннер героя: десктопное изображение" onChange={(e) => handleHeroUpload(e, 'desktop')} className="mt-1.5 block w-full max-w-full text-[12px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-subtle">Мобильный</div>
                {heroMobilePreview ? <Image src={heroMobilePreview} width={80} height={96} className="mt-1 rounded-xl bg-muted object-cover" alt="" /> : null}
                <input type="file" accept="image/*" aria-label="Баннер героя: мобильное изображение" onChange={(e) => handleHeroUpload(e, 'mobile')} className="mt-1.5 block w-full max-w-full text-[12px]" />
              </div>
            </div>

            <label htmlFor={`${uid}-hero-kicker`} className={labelClass}>Кикер</label>
            <input id={`${uid}-hero-kicker`} value={heroKicker} onChange={(e) => setHeroKicker(e.target.value)} className={inputClass} />
            <label htmlFor={`${uid}-hero-city`} className={labelClass}>Город</label>
            <input id={`${uid}-hero-city`} value={heroCity} onChange={(e) => setHeroCity(e.target.value)} className={inputClass} />
            <label htmlFor={`${uid}-hero-headline`} className={labelClass}>Заголовок</label>
            <input id={`${uid}-hero-headline`} value={heroHeadline} onChange={(e) => setHeroHeadline(e.target.value)} className={inputClass} />
            <label htmlFor={`${uid}-hero-subtext`} className={labelClass}>Подзаголовок</label>
            <textarea
              id={`${uid}-hero-subtext`}
              rows={2}
              value={heroSubtext}
              onChange={(e) => setHeroSubtext(e.target.value)}
              className="mt-1.5 w-full resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Главная — факты</div>
            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-deposit-label`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Залог — значение</label>
                <input id={`${uid}-deposit-label`} value={depositLabel} onChange={(e) => setDepositLabel(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-deposit-caption`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Залог — подпись</label>
                <input id={`${uid}-deposit-caption`} value={depositCaption} onChange={(e) => setDepositCaption(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-pickup-time-label`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Выдача — значение</label>
                <input id={`${uid}-pickup-time-label`} value={pickupTimeLabel} onChange={(e) => setPickupTimeLabel(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-pickup-time-caption`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Выдача — подпись</label>
                <input id={`${uid}-pickup-time-caption`} value={pickupTimeCaption} onChange={(e) => setPickupTimeCaption(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Шаги «Как это работает»</div>
            <div className="mt-1.5 flex flex-col gap-2.5">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-2 rounded-xl bg-muted p-2.5">
                  <div className="flex-1">
                    <input
                      value={s.title}
                      onChange={(e) => setSteps((prev) => prev.map((v, idx) => (idx === i ? { ...v, title: e.target.value } : v)))}
                      aria-label={`Шаг ${i + 1}: заголовок`}
                      placeholder="Заголовок шага"
                      className="h-9 w-full rounded-lg border border-input bg-white px-2.5 text-[13px] outline-none focus:border-foreground"
                    />
                    <input
                      value={s.text}
                      onChange={(e) => setSteps((prev) => prev.map((v, idx) => (idx === i ? { ...v, text: e.target.value } : v)))}
                      aria-label={`Шаг ${i + 1}: текст`}
                      placeholder="Текст шага"
                      className="mt-1.5 h-9 w-full rounded-lg border border-input bg-white px-2.5 text-[13px] outline-none focus:border-foreground"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                    className="w-8 shrink-0 self-start rounded-lg bg-white text-[13px] text-subtle hover:text-accent"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setSteps((prev) => [...prev, { title: '', text: '' }])} className="mt-2 text-[12.5px] font-semibold text-subtle hover:text-foreground">
              + добавить шаг
            </button>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Блок «Нужен совет»</div>
            <label htmlFor={`${uid}-cta-kicker`} className={labelClass}>Кикер</label>
            <input id={`${uid}-cta-kicker`} value={ctaKicker} onChange={(e) => setCtaKicker(e.target.value)} className={inputClass} />
            <label htmlFor={`${uid}-cta-headline`} className={labelClass}>Заголовок</label>
            <input id={`${uid}-cta-headline`} value={ctaHeadline} onChange={(e) => setCtaHeadline(e.target.value)} className={inputClass} />
            <label htmlFor={`${uid}-cta-subtext`} className={labelClass}>Подтекст</label>
            <textarea
              id={`${uid}-cta-subtext`}
              rows={2}
              value={ctaSubtext}
              onChange={(e) => setCtaSubtext(e.target.value)}
              className="mt-1.5 w-full resize-y rounded-xl border border-input bg-muted-well px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Контакты</div>
            <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor={`${uid}-contact-phone`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Телефон</label>
                <input id={`${uid}-contact-phone`} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-contact-email`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Email</label>
                <input id={`${uid}-contact-email`} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-contact-telegram`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Telegram (@handle)</label>
                <input id={`${uid}-contact-telegram`} value={contactTelegram} onChange={(e) => setContactTelegram(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-contact-telegram-url`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Telegram (ссылка)</label>
                <input id={`${uid}-contact-telegram-url`} value={contactTelegramUrl} onChange={(e) => setContactTelegramUrl(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-contact-vk-url`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">VK (ссылка)</label>
                <input id={`${uid}-contact-vk-url`} value={contactVkUrl} onChange={(e) => setContactVkUrl(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-contact-address`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Адрес</label>
                <input id={`${uid}-contact-address`} value={contactAddress} onChange={(e) => setContactAddress(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-contact-hours`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Часы работы (текст на сайте)</label>
                <input id={`${uid}-contact-hours`} value={contactHours} onChange={(e) => setContactHours(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-3.5 rounded-2xl border border-border bg-muted-well p-3.5 sm:col-span-2 sm:grid-cols-2">
                <div className="text-[11.5px] leading-snug text-subtle sm:col-span-2">
                  Часы для календаря выбора дат аренды (число 0–23) — отдельно от текста выше, им нельзя пользоваться для расчётов. Держите оба поля согласованными: разошедшиеся значения — та же ошибка, которую эти два поля чинят.
                </div>
                <div>
                  <label htmlFor={`${uid}-business-hours-open`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Открытие (час)</label>
                  <input
                    id={`${uid}-business-hours-open`}
                    type="number"
                    min={0}
                    max={23}
                    value={businessHoursOpen}
                    onChange={(e) => setBusinessHoursOpen(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`${uid}-business-hours-close`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Закрытие (час)</label>
                  <input
                    id={`${uid}-business-hours-close`}
                    type="number"
                    min={0}
                    max={23}
                    value={businessHoursClose}
                    onChange={(e) => setBusinessHoursClose(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor={`${uid}-yandex-maps-url`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Яндекс.Карты (ссылка)</label>
                <input id={`${uid}-yandex-maps-url`} value={yandexMapsUrl} onChange={(e) => setYandexMapsUrl(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor={`${uid}-two-gis-url`} className="text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">2ГИС (ссылка)</label>
                <input id={`${uid}-two-gis-url`} value={twoGisUrl} onChange={(e) => setTwoGisUrl(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="sticky top-3.5 rounded-3xl border border-border bg-card p-6">
            <button type="button" onClick={handleSave} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
