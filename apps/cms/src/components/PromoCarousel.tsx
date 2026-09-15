'use client'

// Ported from apps/web/src/components/PromoCarousel.tsx (docs/PLAN-next-
// migration.md Stage 2) — verbatim, already a React island there.
import { useEffect, useState } from 'react'
import Image from 'next/image'

// C4 (design_handoff_swiss_bento/08-instruction.md, G3): real rendered slot
// — `lg:col-span-8` of `grid-cols-1 lg:grid-cols-12` inside container-page,
// full width below lg/1024px, 8/12 of the capped-1400px content from there
// up (~929px cap). Not `priority`: this carousel appears on the homepage
// below the hero+marquee and again on promotion detail pages below that
// page's own hero — neither is the page's designated hero-cover slot per
// the instruction, so it stays lazy like every other non-hero image.
const CAROUSEL_SIZES = '(min-width: 1520px) 929px, (min-width: 1024px) 62vw, 92vw'

export interface PromoSlide {
  id: number
  title: string
  kicker?: string
  text?: string
  imageUrl?: string
  linkUrl?: string
}

interface Props {
  promos: PromoSlide[]
}

const ROTATE_MS = 9000

// Ported from the delivered design's promo carousel (dc_script.txt: promoIndex
// timer + promoStack/promoRows view-model) — cross-fading image stack on the
// left, a clickable row list with an animated progress bar on the right.
export default function PromoCarousel({ promos }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused || promos.length <= 1) return
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % promos.length)
    }, ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [paused, promos.length])

  if (promos.length === 0) return null

  const active = promos[index]
  const next = () => setIndex((i) => (i + 1) % promos.length)
  const prev = () => setIndex((i) => (i - 1 + promos.length) % promos.length)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 pt-8">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Акции</div>
          <h2 className="mt-2.5 text-[clamp(26px,3vw,40px)] font-medium tracking-[-0.04em]">Что выгодно прямо сейчас</h2>
        </div>
        {promos.length > 1 && (
          <div className="flex items-center gap-3">
            <span className="mr-1 text-[11px] font-semibold tracking-[0.14em] text-subtle">
              {String(index + 1).padStart(2, '0')} / {String(promos.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={prev}
              aria-label="Предыдущая акция"
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full border border-border bg-card text-[16px] transition-[background-color,color,transform] duration-240 ease-expo hover:-translate-x-0.5 hover:bg-primary hover:text-primary-foreground"
            >
              ←
            </button>
            {/* Real bug, independent of any curve/duration question: this
                only transitioned `transform`, so hover:bg-primary-hover
                snapped instantly with no easing at all. Added
                background-color to the property list, at the same
                duration-240 ease-expo pairing the ← button (and every other
                combined background+transform hover in the app — see
                RentalDatePicker's date boxes, the product page's kit-item
                pills) already uses. */}
            <button
              type="button"
              onClick={next}
              aria-label="Следующая акция"
              className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-primary text-primary-foreground transition-[background-color,transform] duration-240 ease-expo hover:translate-x-0.5 hover:bg-primary-hover"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3.5 lg:grid-cols-12" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {/* C1 (design_handoff_swiss_bento/08-instruction.md, G2): left as a
            plain <a>, deliberately not next/link — linkUrl is the same
            free-text admin field promotions/[slug]/page.tsx's own "Подробнее"
            button reads (see its comment); it can be an off-site URL, so a
            fixed Link here would be wrong for that case. */}
        {/* template.html's [data-promo] rule sets a literal 620px height at
            <=760px and the default 470px above it — not a Tailwind stock
            breakpoint (640/768), so this needs the arbitrary max-[760px]
            variant rather than sm:/md: to land on the exact same threshold.
            The previous 380px/sm:470px pair had both the value AND the
            direction backwards (shorter on mobile instead of taller). */}
        <a
          href={active.linkUrl || '#'}
          className="relative block h-[470px] max-[760px]:h-[620px] overflow-hidden rounded-[26px] border border-border bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)] lg:col-span-8"
        >
          {promos.map((p, i) => (
            // 03-motion.md's own curve table reserves a fourth curve —
            // `promo`, wired as the `--ease-inout` token (tokens.css) —
            // "только слайдер акций": the one place in the whole design that
            // isn't expo/spring/color-ease. It had zero usages anywhere in
            // the app before this fix (confirmed via `design-sync audit`) —
            // this cross-fade is the one and only place it belongs. Also
            // splits duration per template.html:
            // opacity 900ms, the background's own translate 1200ms (the
            // "параллакс" entry in 03-motion.md's duration table) — both had
            // been collapsed onto one shared 900ms ease-expo.
            <div
              key={p.id}
              className="absolute inset-0 [transition:opacity_900ms_var(--ease-inout),transform_1200ms_var(--ease-inout)]"
              style={{
                opacity: i === index ? 1 : 0,
                transform: i === index ? 'none' : 'scale(1.02)',
                zIndex: i === index ? 2 : 1,
              }}
            >
              {p.imageUrl && <Image src={p.imageUrl} alt={p.title} fill sizes={CAROUSEL_SIZES} className="object-cover" />}
            </div>
          ))}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(95deg,rgba(10,10,10,0.86) 0%,rgba(10,10,10,0.52) 54%,rgba(10,10,10,0.08) 100%)' }}
          />
          <div key={active.id} className="pointer-events-none absolute inset-0 flex flex-col justify-between p-[30px] text-white">
            {active.kicker && (
              <span className="self-start rounded-full bg-white/[0.16] px-3.5 py-[7px] text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-[10px]" style={{ animation: 'bnRise 560ms var(--ease-expo) both' }}>
                {active.kicker}
              </span>
            )}
            <div>
              <div className="max-w-[13ch] text-[clamp(28px,3.4vw,48px)] font-medium leading-[1.02] tracking-[-0.04em]" style={{ animation: 'bnRise 620ms var(--ease-expo) 60ms both' }}>
                {active.title}
              </div>
              {active.text && (
                <div className="mt-3.5 max-w-[380px] text-[14px] leading-[1.5] text-white/78" style={{ animation: 'bnRise 620ms var(--ease-expo) 120ms both' }}>
                  {active.text}
                </div>
              )}
            </div>
          </div>
        </a>

        <div className="flex flex-col gap-1 rounded-[26px] border border-border bg-card p-3.5 lg:col-span-4">
          {promos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setIndex(i)}
              className="relative flex flex-1 items-center gap-3.5 overflow-hidden rounded-[18px] px-[18px] py-4 text-left transition-colors duration-240 ease-expo"
              style={{ background: i === index ? '#0A0A0A' : '#F9F8F7', color: i === index ? '#fff' : '#0A0A0A' }}
            >
              <span className="text-[10px] font-semibold tracking-[0.14em] opacity-50">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                {p.kicker && <div className="text-[9.5px] font-semibold uppercase tracking-[0.15em] opacity-60">{p.kicker}</div>}
                <div className="mt-1.5 text-[16px] font-medium leading-[1.25] tracking-[-0.02em]">{p.title}</div>
              </div>
              {i === index && (
                <span
                  key={`${p.id}-${index}`}
                  className="absolute bottom-3 left-[18px] h-0.5 origin-left rounded-full bg-white/45"
                  style={{ width: 'calc(100% - 36px)', animation: `bnBar ${ROTATE_MS}ms linear both` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
