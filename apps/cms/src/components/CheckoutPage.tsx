'use client'

// Ported from apps/web/src/components/CheckoutPage.tsx (docs/PLAN-next-
// migration.md Stage 2, page group 7). Structure/validation/state are
// verbatim; the only real change is what handleSubmit calls — the old
// createOrder()/createOrderItem()/deleteOrderItem()/submitOrder() REST
// sequence (four-plus separate HTTP round trips through lib/payload.ts's
// mutate() wrapper) is now one call to the submitCheckout() Server Action
// (./actions.ts), which does the same order-create → items-create (with the
// same rollback-on-failure) → submit sequence server-side over the Local
// API in a single request/response.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useStore } from '@nanostores/react'
import { $cart, removeFromCart, setItemQuantity, clearCart, type CartItem, MAX_CART_ITEM_QUANTITY } from '../stores/cart'
import { $selectedDates } from '../stores/dates'
import { calculateRentalDays, formatCurrency } from '../lib/pricing'
// formatShifts, not an inline ternary: Russian needs three forms
// (1 смена / 2 смены / 5 смен), and lib/dateRange.ts already carries
// the rule that every other screen uses.
import { formatShifts, formatDateHuman } from '../lib/dateRange'
// calculateLineTotal, not getLineTotal (stores/cart.ts): getLineTotal always
// prices at the cart's own item.quantity, with no way to ask "what would
// this line cost at a *different* quantity" — exactly what's needed once an
// acknowledged shortfall can submit fewer units than the cart holds. This is
// the same function collections/OrderItems.ts's beforeValidate hook calls
// server-side (A1's single source of truth for per-line pricing), so the
// checkout's displayed total and the eventual `lineTotal` Payload computes
// and stores can never drift apart — no second copy of the maths here.
import { calculateLineTotal } from '../lib/rental/pricing'
import { getRentalAvailabilityBulk } from '../lib/rentalAvailability'
import { submitCheckout } from '../app/(frontend)/checkout/actions'
import { translateCheckoutError, pluralUnits } from '../lib/checkoutErrors'
import RentalDatePicker, { type RentalDatePickerHandle } from './RentalDatePicker'

const NAME_RE = /^[A-Za-zА-Яа-яЁё\s-]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Digits-only mask, same shape as the old app's phoneMask util (+7 (XXX)
// XXX-XX-XX) but hand-rolled here since we didn't port the paste-handling
// hook — this is presentation, not the pricing/availability logic that had
// to be ported verbatim.
function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('8')) digits = '7' + digits.slice(1)
  if (!digits.startsWith('7')) digits = '7' + digits
  digits = digits.slice(0, 11)
  const rest = digits.slice(1)
  let out = '+7'
  if (rest.length > 0) out += ` (${rest.slice(0, 3)}`
  if (rest.length >= 3) out += ')'
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`
  return out
}

function isPhoneComplete(value: string): boolean {
  return value.replace(/\D/g, '').length === 11
}

// The per-rental-line availability state (A4, design_handoff_swiss_bento/
// 08-instruction.md, audit finding N10). Five states, not the old two-value
// `avail === undefined` (unknown) vs. a number: 'na' covers both "not a
// rental line" and "no dates chosen yet" (nothing to check); 'loading' and
// 'error' are new — a failed `getRentalAvailabilityBulk()` call used to fall
// into the same `avail === undefined` bucket as "haven't checked yet",
// which rendered as the false-positive "свободно на ваши даты". 'known'
// carries the real available count so the shortfall message can say how
// many are actually free.
// 'missing' is distinct from 'loading' (review finding 2, on top of A4/N10):
// once a bulk fetch has actually completed without error, a cart product id
// absent from the response is a real, terminal condition — the product was
// deleted/unpublished after being added to a persisted localStorage cart —
// not "haven't checked yet". Conflating the two left a phantom line stuck on
// "проверяем…" forever with nothing blocking submission.
type ItemAvailability =
  | { kind: 'na' }
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'known'; available: number }

// A rental line is "short" once it asks for more than is actually free —
// the fixed threshold from N10 (`avail < item.quantity`, not the old
// `avail <= 0`, which missed a 1-free/6-requested line entirely).
function isShort(status: ItemAvailability, item: CartItem): status is { kind: 'known'; available: number } {
  return status.kind === 'known' && status.available < item.quantity
}

// Identifies "the exact situation the customer said 'оставить' about" —
// this product, this requested quantity, these dates, AND the available
// count the customer actually read when they clicked "оставить" (the
// number quoted in the banner text, e.g. "свободно 2, а в заявке 6"). Any
// change to any of these produces a different key, so a stale acknowledgment
// from before the change can never silently carry over to cover it; the
// customer has to actively re-confirm.
//
// C1 (design_handoff_swiss_bento/08-instruction.md, G2): the `available`
// argument was added specifically for this item. Before C1, every checkout
// link was a plain <a>, so leaving /checkout and coming back was always a
// full document reload — acknowledgedShortfalls (a plain useState, see its
// own comment above) reset to {} on every such round trip, and quantity+
// dates alone were enough to say "this ack is about the exact situation
// still on screen." Once the product-thumbnail/title links below became
// next/link, that's no longer guaranteed: CheckoutPage lives under the
// shared (frontend) root layout and is never itself remounted by a
// same-app client-side navigation, and Next's client Router Cache can
// restore a previously-rendered instance of a page (including its React
// state) on a "back" navigation within its staleness window — exactly the
// mechanism that makes back/forward feel instant elsewhere in this app.
// So quantity+dates matching is no longer sufficient: the *available* count
// itself can have changed server-side during the excursion (another
// customer books the last unit) with no local signal that it did, since
// nothing here forces a remount or a fresh fetch on return. Folding
// `available` into the key closes that gap without depending on precisely
// when Next does or doesn't reuse the component: resolveAcknowledgedQuantity
// re-evaluates this key against the *current* status.available on every
// render (not just at ack time), so a stale ack whose recorded key no
// longer matches reality simply stops resolving — the customer sees the
// unacknowledged "оставить часть" banner again, not a silently-honored
// acknowledgment from a different situation.
function shortfallKey(item: CartItem, dates: { startDate: Date | null; endDate: Date | null }, available: number): string {
  return `${item.quantity}|${dates.startDate?.getTime() ?? ''}|${dates.endDate?.getTime() ?? ''}|${available}`
}

// Review finding 1 (on top of A4/N10): "оставить, менеджер подтвердит" used
// to acknowledge the full requested quantity, which the server's
// beforeValidate hook (OrderItems.ts) then unconditionally rejected with the
// exact same numbers the customer just read — a guaranteed dead end, since
// that hook has no bypass and must not gain one (a client-supplied override
// would be a public way to defeat the stock check, see G1). So "оставить"
// now means something the server can actually accept: submit the line at
// the quantity that is genuinely available, and record the rest for the
// manager (see handleSubmit's shortfallNotes). This resolves to null — "not
// resolved, don't submit this line as any quantity" — for a line that isn't
// short at all, isn't acknowledged yet, or whose available count is 0 (a
// zero-quantity line can't be ordered; that case only offers removal or a
// date change, never this button — see the render below).
function resolveAcknowledgedQuantity(
  item: CartItem,
  status: ItemAvailability,
  dates: { startDate: Date | null; endDate: Date | null },
  acknowledgedShortfalls: Record<number, string>,
): number | null {
  if (!isShort(status, item)) return null
  if (status.available <= 0) return null
  if (acknowledgedShortfalls[item.productId] !== shortfallKey(item, dates, status.available)) return null
  return status.available
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'mt-2 h-12 w-full rounded-[14px] border border-input bg-muted-well px-4 text-[15px] outline-none transition-[border-color,background-color] duration-240 ease-expo focus:border-foreground focus:bg-white'

// B6 (design_handoff_swiss_bento/08-instruction.md, audit finding N12): this
// used to be a `<div onClick>` — no role, no tabIndex, no input, so it could
// not be operated from the keyboard at all, even though these two checkboxes
// gate submission (validate() below) and one of them is consent to
// personal-data processing. Now a real `<input type="checkbox">` inside a
// real `<label>`: Tab reaches it, Space toggles it (both native, for free),
// and the label's full text becomes its accessible name (so a screen reader
// announces the actual consent text, not just "checkbox"). The input itself
// is visually hidden with `sr-only` (clip-based, not `display:none` /
// `hidden` — those would also remove it from the tab order and the
// accessibility tree, defeating the point) while the `✓` box is a sibling
// `aria-hidden` span kept purely for the visual checked/unchecked state, and
// mirrors :checked's focus via the `peer`/`peer-focus-visible:` pair since
// the real focus target (the input) has no visible box of its own to draw a
// ring on. `outline-ring` reuses the existing `--color-ring` token already
// declared in global.css's @theme (same value as --color-foreground) — no
// new color per design_handoff_swiss_bento/08-instruction.md §3 ("не заводить
// новые цвета"). Native label/input pairing also resolves the classic
// wrapped-label trap for free: per the HTML spec, a click that lands on a
// nested interactive descendant (the policy `<a>` inside the label text)
// runs *that* element's own activation (navigation) instead of also
// forwarding a toggle to the labeled control — unlike the old `<div
// onClick>`, which had no such exclusion and would have fired on every
// click inside it, link or not, once it grew a real click handler again.
// Verified live in a real browser, not just read off the spec — see the dev
// log entry for this change.
function CheckBox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: React.ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className="-mx-3 flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition-colors duration-240 ease-expo hover:bg-muted"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[12px] font-bold transition-[background-color,color,transform] duration-240 ease-expo peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring"
        style={checked ? { background: '#0A0A0A', color: '#fff', transform: 'scale(1.06)' } : { background: '#F0EFEC', color: 'transparent' }}
      >
        ✓
      </span>
      <span className="text-[12.5px] leading-[1.45] text-muted-foreground">{label}</span>
    </label>
  )
}

export default function CheckoutPage() {
  const storeCart = useStore($cart)
  const storeDates = useStore($selectedDates)
  // $cart (localStorage) and $selectedDates (sessionStorage) can both
  // legitimately differ between the server render and the client's first
  // (hydration) render — gate on mounted, same pattern as
  // RentalDatePicker/ProductPurchasePanel/CartBadge. This matters more here
  // than most call sites: cart.length === 0 picks an entirely different
  // top-level branch to render (empty-state vs. the real form), which is
  // exactly the kind of structural mismatch React's hydration check catches.
  // react-hooks/set-state-in-effect flags this generically, but there's no
  // external-system subscription to rewrite it into (see part 1/5's notes).
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), [])
  const cart = mounted ? storeCart : []
  const dates = mounted ? storeDates : { startDate: null, endDate: null }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [comment, setComment] = useState('')
  const [agreeData, setAgreeData] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  // Review finding 3 (on top of A4/N10): the old code stored validate()'s
  // output as state, set once at the moment of a submit attempt — so a
  // condition that produced an error (e.g. a failed availability fetch)
  // going away later (a successful "Повторить") never refreshed it; the
  // banner just sat there showing a message that was no longer true until
  // the customer clicked submit again. Storing only "has the customer tried
  // to submit yet" and recomputing validate() fresh on every render
  // (`displayErrors` below) keeps the banner live instead of a snapshot.
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)
  // Separate from `displayErrors` (the client-side validate() checklist,
  // e.g. "Введите имя") — this is the *server's* rejection of the submitted
  // order (A3, design_handoff_swiss_bento/08-instruction.md): a
  // RENTAL_DATES_INVALID/RENTAL_QUANTITY_UNAVAILABLE/etc. code, already
  // translated to Russian by lib/checkoutErrors.ts, with `canChangeDates`
  // saying whether an "изменить даты" action applies. Reflects the last
  // actual server response, so — unlike `displayErrors` — it deliberately
  // doesn't re-evaluate itself on every render; it's cleared at the start of
  // the next submit attempt instead (handleSubmit).
  const [submitError, setSubmitError] = useState<{ message: string; canChangeDates: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // E2 (design_handoff_swiss_bento/08-instruction.md, S4): "успех — не
  // toast, а замена панели на карточку с номером заявки, датами" — carries
  // both, captured at the moment of a successful submit rather than read
  // back from stores afterward (clearCart() empties $cart immediately
  // after, and this survives regardless of what the stores do next).
  const [success, setSuccess] = useState<{ orderId: number; startDate: Date | null; endDate: Date | null } | null>(null)
  const [availability, setAvailability] = useState<Record<number, number>>({})
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  // True once a bulk fetch has actually completed successfully for the
  // *current* dates/cart — distinct from availabilityLoading being false,
  // which is also true before the first fetch has ever run. Review finding
  // 2 (on top of A4/N10): without this, "no entry for this product yet"
  // (haven't checked) and "checked, and the server didn't return this
  // product" (deleted/unpublished — a real, terminal condition) were both
  // indistinguishable from missing data in the availability map, so the
  // second case rendered as an endless "проверяем…" instead of the blocking
  // problem it actually is.
  const [availabilityChecked, setAvailabilityChecked] = useState(false)
  // true only for "the fetch itself failed" (network/server error) — never
  // set for "haven't checked yet" or "checked, and it's short". Must render
  // as an error, not silently collapse into either "free" or "booked" (N10).
  const [availabilityError, setAvailabilityError] = useState(false)
  // Bumped by the "Повторить" retry button to re-run the availability
  // effect below without waiting for dates/cart to change.
  const [retryNonce, setRetryNonce] = useState(0)
  // Records each productId's explicit "оставить, менеджер подтвердит"
  // choice, keyed by shortfallKey() so it only ever covers the exact
  // quantity/dates/available-count it was given for (see that function's
  // own comment — C1, design_handoff_swiss_bento/08-instruction.md, G2,
  // extended the key with `available` once leaving/returning to this page
  // could no longer be relied on to reset this to {} via a full reload).
  const [acknowledgedShortfalls, setAcknowledgedShortfalls] = useState<Record<number, string>>({})
  const datePickerRef = useRef<RentalDatePickerHandle>(null)

  const hasRentalItems = cart.some((i) => i.listingType === 'rental')
  const hasDates = Boolean(dates.startDate && dates.endDate)
  const days = calculateRentalDays(dates.startDate ?? undefined, dates.endDate ?? undefined)

  useEffect(() => {
    if (!hasDates) {
      // react-hooks/set-state-in-effect flags this generically, but the
      // effect as a whole fetches an external system (rental availability)
      // and sets state from its callback below — this early-exit branch
      // just resets that same state synchronously when there are no dates
      // to check availability for, same class of exception as the
      // synchronous setChecking(true) in ProductPurchasePanel.tsx.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvailability({})
      // react-hooks/set-state-in-effect only flags the first synchronous
      // setState call in a given branch, not every one after it — verified
      // empirically (removing this second disable/the two below in the
      // fetch path leaves `pnpm lint` clean, adding them back reports them
      // as unused) rather than assumed from the rule's docs.
      setAvailabilityError(false)
      setAvailabilityChecked(false)
      // Review finding 4 (on top of A4/N10): this branch never reset
      // availabilityLoading before, so a fetch superseded mid-flight (its
      // own cleanup already flipped `cancelled`, suppressing its `.finally`)
      // could leave the flag stuck true forever once this branch is the one
      // that runs next — e.g. dates get cleared while a fetch is in flight.
      setAvailabilityLoading(false)
      return
    }
    const rentalIds = cart.filter((i) => i.listingType === 'rental').map((i) => i.productId)
    if (rentalIds.length === 0) {
      // Same stuck-loading path as the !hasDates branch above, just reached
      // with dates chosen but every rental line removed from the cart —
      // reachable (review finding 4's own example: drop the last rental
      // line while a bulk fetch for it is in flight).
      setAvailabilityError(false)
      setAvailabilityChecked(false)
      setAvailabilityLoading(false)
      return
    }
    let cancelled = false
    // Same synchronous-setState-before-the-fetch-starts exception as
    // ProductPurchasePanel.tsx's setChecking(true) — the loading flag has to
    // flip before the request goes out, not from inside its callback. No
    // eslint-disable needed here (unlike that file): this call sits behind
    // the `rentalIds.length === 0` guard above, and react-hooks/set-state-
    // in-effect doesn't flag a setState that isn't unconditionally the
    // effect's first statement.
    setAvailabilityLoading(true)
    setAvailabilityError(false)
    // Not yet checked *for this parameter set* — cleared up front so a
    // product id that's genuinely still in flight never briefly reads as
    // 'missing' (getItemAvailability only returns 'missing' once
    // availabilityChecked is true again, from a completed fetch below).
    setAvailabilityChecked(false)
    getRentalAvailabilityBulk(rentalIds, dates.startDate ?? undefined, dates.endDate ?? undefined)
      .then((res) => {
        if (!cancelled) {
          setAvailability(res)
          setAvailabilityChecked(true)
        }
      })
      .catch(() => {
        // The bug this whole effect exists to fix (N10): this used to be an
        // empty catch, so a failed fetch left `availability` exactly as it
        // was before — indistinguishable from "checked, all free". Now a
        // failure is its own state (see ItemAvailability), rendered as an
        // explicit error with a retry, never as free or booked.
        if (!cancelled) setAvailabilityError(true)
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDates, dates.startDate?.getTime(), dates.endDate?.getTime(), cart.map((i) => i.productId).join(','), retryNonce])

  // Per-line availability state the item row and validate() both read from
  // (see the ItemAvailability comment above for what each state means).
  const getItemAvailability = (item: CartItem): ItemAvailability => {
    if (item.listingType !== 'rental' || !hasDates) return { kind: 'na' }
    if (availabilityError) return { kind: 'error' }
    // Not just availabilityLoading: before the *first* successful fetch for
    // the current dates/cart, availabilityChecked is also false, and that
    // case must render as loading too, not 'missing' — see its own state
    // comment above.
    if (availabilityLoading || !availabilityChecked) return { kind: 'loading' }
    const avail = availability[item.productId]
    // The fetch completed, without error, and still no entry for this
    // product (review finding 2, on top of A4/N10): rentalIds is derived
    // from this same `cart`, so the most recent successful fetch necessarily
    // asked about this productId — an absent entry here can only mean the
    // server didn't return it (endpoints/rentalAvailabilityBulk.ts builds
    // its map from products.docs, so a deleted/unpublished product is
    // simply missing from the response). Real and terminal, not "still
    // checking" — must render and block, never pass through silently.
    if (avail === undefined) return { kind: 'missing' }
    return { kind: 'known', available: avail }
  }

  // The one place that decides "how many units of this line actually enter
  // the order" — money-display follow-up to A4/N10's review finding 1.
  // resolveAcknowledgedQuantity already *is* that decision for handleSubmit
  // (below); this just wraps it with the `?? item.quantity` fallback every
  // display site needs (a non-short line, or a short line not yet
  // acknowledged, still shows/submits the full cart quantity). Both
  // handleSubmit and every displayed total call this one function, so the
  // price a customer reads and the price/quantity the order is actually
  // built from can't drift apart the way $cartTotal alone (full cart
  // quantities, no shortfall awareness) did.
  const getDisplayQuantity = (item: CartItem): number => {
    const status = getItemAvailability(item)
    return resolveAcknowledgedQuantity(item, status, dates, acknowledgedShortfalls) ?? item.quantity
  }

  // Line total at the quantity that will actually be ordered, not
  // getLineTotal(item) (stores/cart.ts), which always prices at the cart's
  // own item.quantity. calculateLineTotal (lib/rental/pricing.ts) is the
  // same function OrderItems.ts's beforeValidate hook uses to compute the
  // stored `lineTotal` server-side (A1) — reused here rather than
  // re-deriving rental-day/price maths locally, per this fix's own
  // constraint.
  const getDisplayLineTotal = (item: CartItem): number =>
    calculateLineTotal({
      listingType: item.listingType,
      unitPrice: item.price,
      quantity: getDisplayQuantity(item),
      startDate: dates.startDate,
      endDate: dates.endDate,
    })

  // Replaces the old `mounted ? storeTotal : 0` (storeTotal from
  // $cartTotal, stores/cart.ts) — $cartTotal is left untouched (the navbar
  // badge legitimately prices the full cart), but the checkout's own «К
  // оплате»/«Ставка за смену» must reflect exactly what gets submitted, so
  // it's summed locally here from getDisplayLineTotal instead of read off
  // the global store. Same mounted-gate reasoning as before: before mount,
  // `cart` is already `[]` (see above), so this reduces to 0 on its own,
  // but the explicit ternary keeps that guarantee obvious rather than
  // incidental. This is still the one and only place «К оплате» is
  // computed — B3 (below) adds a second, independent number for display
  // («Ставка за смену»), it does not touch how the payable total itself is
  // derived, so there is still exactly one path from cart state to the
  // number the customer is asked to pay, matching what the server's
  // beforeValidate hook (OrderItems.ts) stores as `orders.totalPrice`.
  const total = mounted ? Math.round(cart.reduce((sum, item) => sum + getDisplayLineTotal(item), 0)) : 0

  // Ставка за смену (B3, design_handoff_swiss_bento/08-instruction.md,
  // audit finding N3): what one shift costs for everything currently in
  // the cart — sum of price × quantity across lines, deliberately NOT
  // multiplied by the day count. Before this fix, the block's "Аренда за
  // смену" row printed `total` itself (already days-and-quantity-inclusive)
  // under a per-shift label, so on a 3-day rental the same number appeared
  // twice under two different, contradictory claims. No duration discounts
  // exist (README.md's «Фидельность»: цена = ставка за сутки × число суток
  // × количество, скидок за длительность нет), so this plain multiplication
  // — not a call through calculateLineTotal/calculateRentalPrice, which
  // both fold in the day count — is the correct, complete definition of
  // "rate", not a shortcut around it. getDisplayQuantity, not
  // item.quantity, for the same reason `total` above already uses it (A4):
  // an acknowledged shortfall enters the order at the available quantity,
  // and every number on this screen must agree on which quantity that is —
  // computing this from raw item.quantity while `total` uses the resolved
  // one would reintroduce N3's own defect in a new shape.
  //
  // Identity this must preserve: ставка × смены === the sum of the line
  // totals already shown per row === what the server stores as
  // orders.totalPrice. It holds exactly for realistic (integer-rouble)
  // prices — per line, calculateRentalPrice does `Math.round(price * days)`
  // before multiplying by quantity, and `price * days` is already an
  // integer whenever `price` is, so that Math.round is a no-op and
  // `Σ (price_i × days × qty_i)` equals `Σ (price_i × qty_i) × days`
  // exactly, i.e. `rate × days`. This only lines up cleanly for a
  // rental-only cart, which is the only case «Срок»/«смены» is shown for
  // (gated on hasDates below, same as before this fix) — a cart mixing
  // rental and sale lines has no single "смены" to multiply a sale line's
  // flat price by, so `rate` here intentionally sums every line's price ×
  // quantity (matching the audit's literal wording) while `total` above
  // (unchanged) stays the one true payable figure regardless of mix.
  // Rental lines only. The instruction's formula (итог = ставка × смены)
  // silently assumes a rental-only cart: a sale line has no «смены» to be
  // multiplied by, so folding it into the rate would print three rows whose
  // arithmetic visibly does not work — N3's own disease in a new form. Sale
  // lines are therefore summed separately below and added, not multiplied.
  const rate = mounted
    ? cart.reduce((sum, item) => (item.listingType === 'rental' ? sum + item.price * getDisplayQuantity(item) : sum), 0)
    : 0
  // Flat, not per-shift: ownership transfers, so there is no duration to
  // apply. Rendered as its own row only when such a line exists, so an
  // ordinary rental cart shows exactly the composition B3 specifies.
  const saleTotal = mounted
    ? cart.reduce((sum, item) => (item.listingType === 'sale' ? sum + item.price * getDisplayQuantity(item) : sum), 0)
    : 0
  const hasSaleItems = cart.some((i) => i.listingType === 'sale')

  // B2 (design_handoff_swiss_bento/08-instruction.md, audit finding N4): a
  // cart survives in localStorage across sessions/tabs, dates don't
  // (sessionStorage, by design — B1's own «Сбросить» exists because dates
  // are meant to reset). With rental lines in the cart and no dates, `total`
  // above is genuinely 0 (getDisplayLineTotal → calculateLineTotal returns 0
  // for a rental line with no startDate/endDate) — not a real price, just
  // an unknown one. «К оплате» must not print that 0 as if it were the
  // answer. A sale line has no date dimension at all (calculateLineTotal
  // prices it unconditionally), so it never makes `total` unknown on its
  // own — only an un-dated *rental* line does, hence gating on
  // `hasRentalItems` specifically rather than `cart.length > 0`.
  const canComputeTotal = !hasRentalItems || hasDates

  if (success) {
    // E2 (design_handoff_swiss_bento/08-instruction.md, S4): "не toast, а
    // замена панели на карточку с номером заявки, датами и P2 «В каталог»"
    // — the panel-replacement shape and order number/dates were both real
    // gaps: the card previously had neither, and its CTA used the P1
    // (primary/black-pill) treatment where the spec calls for P2 (quiet
    // button, `.btn-ghost` — same convention this codebase already uses for
    // every other P2 instance, e.g. the homepage's "Готовые наборы").
    const { startDate: successStart, endDate: successEnd } = success
    return (
      <div className="flex flex-col items-center rounded-3xl border border-border bg-card py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-[28px] font-medium tracking-[-0.03em]">Заявка отправлена!</h1>
        <p className="mt-3 text-[15px] font-semibold tracking-[-0.01em]">Заявка №{success.orderId}</p>
        {successStart && successEnd && (
          <p className="mt-1 text-[13px] text-subtle">
            {formatDateHuman(successStart)} — {formatDateHuman(successEnd)}
          </p>
        )}
        <p className="mt-3 max-w-[420px] text-[14.5px] text-muted-foreground">
          Мы получили вашу заявку на бронирование. Наш менеджер свяжется с вами в ближайшее время для подтверждения.
        </p>
        <Link href="/catalog" className="btn-ghost mt-8 h-12 px-6 text-[11px]">В каталог</Link>
      </div>
    )
  }

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-border bg-card py-24 text-center">
        <h1 className="text-[26px] font-medium tracking-[-0.03em]">Корзина пуста</h1>
        <p className="mt-3 max-w-[420px] text-[14.5px] text-muted-foreground">
          Добавьте оборудование из каталога, чтобы оформить бронирование.
        </p>
        <Link href="/catalog" className="btn-primary mt-8 h-12 px-6 text-[11px]">Смотреть каталог</Link>
      </div>
    )
  }

  const validate = (): string[] => {
    const errs: string[] = []
    if (!name.trim()) errs.push('Введите имя')
    else if (!NAME_RE.test(name.trim())) errs.push('Имя может содержать только буквы')
    if (!email.trim()) errs.push('Введите email')
    else if (!EMAIL_RE.test(email.trim())) errs.push('Введите корректный email')
    if (!isPhoneComplete(phone)) errs.push('Введите телефон полностью')
    if (!agreeData) errs.push('Необходимо согласие на обработку персональных данных')
    if (!agreeTerms) errs.push('Необходимо согласие с условиями аренды')
    if (hasRentalItems && !hasDates) errs.push('Выберите даты аренды')
    // The pre-submit counterpart to A3's server-side check (OrderItems.ts's
    // beforeValidate hook still throws RENTAL_QUANTITY_UNAVAILABLE and
    // remains the real authority — see this file's header comment). This is
    // deliberately not a hard "quantity must fit" block: "оставить,
    // менеджер подтвердит" is a valid, explicitly-chosen path (N10), so a
    // short line only blocks submission while it's un-acknowledged, not
    // outright. A stale/failed availability read blocks too — submitting
    // while genuinely unable to say whether a line is bookable is exactly
    // the silent failure N10 flags, not something to wave through.
    if (hasRentalItems && hasDates) {
      if (availabilityError) {
        errs.push('Не удалось проверить наличие позиций. Повторите проверку и попробуйте снова.')
      } else if (availabilityLoading || !availabilityChecked) {
        errs.push('Дождитесь проверки наличия позиций.')
      } else {
        // Review finding 2 (on top of A4/N10): a product the server no
        // longer returns used to fall through here unblocked (isShort()
        // never matched an undefined availability entry). 'missing' is now
        // its own terminal state — block outright, the only fix is removal.
        const missing = cart.some((item) => getItemAvailability(item).kind === 'missing')
        if (missing) errs.push('Одна из позиций больше недоступна для аренды. Уберите её из заявки.')
        // Review finding 1: "resolved" now means resolveAcknowledgedQuantity
        // found a real, submittable quantity — not just "the customer
        // clicked оставить at some point". A stale acknowledgment whose
        // available count has since dropped to 0 (a fresh Повторить, or a
        // concurrent booking) no longer counts as resolved, so it can't
        // silently ride through to a submit that would build a zero-quantity
        // line (see resolveAcknowledgedQuantity's own comment).
        const unresolved = cart.some((item) => {
          const status = getItemAvailability(item)
          if (!isShort(status, item)) return false
          return resolveAcknowledgedQuantity(item, status, dates, acknowledgedShortfalls) === null
        })
        if (unresolved) errs.push('Подтвердите или измените позиции с ограниченным наличием.')
      }
    }
    return errs
  }
  const displayErrors = attemptedSubmit ? validate() : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAttemptedSubmit(true)
    const errs = validate()
    setSubmitError(null)
    if (errs.length > 0) return

    setSubmitting(true)
    try {
      // Review finding 1 (on top of A4/N10): for a resolved short line,
      // submit the quantity that's actually available — never the full cart
      // quantity the customer typed — and say so in `notes` for the manager.
      // getDisplayQuantity is the same function the displayed line
      // totals/«К оплате» above are built from, so what the customer read
      // on screen and what gets submitted here are guaranteed to agree —
      // not two independent calls to resolveAcknowledgedQuantity that could
      // drift (its `?? item.quantity` fallback is only reachable for a
      // short line if validate() above already blocked submission, since
      // unresolved shortfalls fail validate() — kept so the type is
      // `number`, not `number | null`, without a non-null assertion).
      const lines = cart.map((item) => ({ item, submitQuantity: getDisplayQuantity(item) }))

      // One line per acknowledged shortfall, appended after the customer's
      // own comment rather than replacing or merging into it — Orders.notes
      // (collections/Orders.ts) is a single free-text field, so this is
      // built once, client-side, as the complete string the Server Action
      // writes verbatim. Several short lines in one cart each get their own
      // sentence, not folded together.
      const shortfallNotes = lines
        .filter(({ item, submitQuantity }) => submitQuantity < item.quantity)
        .map(
          ({ item, submitQuantity }) =>
            `«${item.title}»: клиент запросил ${item.quantity} шт., в заявку включено ${submitQuantity} шт. — уточнить оставшиеся ${item.quantity - submitQuantity} шт.`,
        )

      const result = await submitCheckout({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone,
        notes:
          [telegram.trim() && `Telegram/WhatsApp: ${telegram.trim()}`, comment.trim(), ...shortfallNotes].filter(Boolean).join('\n') ||
          undefined,
        items: lines.map(({ item, submitQuantity }) => ({
          productId: item.productId,
          quantity: submitQuantity,
          startDate: item.listingType === 'rental' ? (dates.startDate?.toISOString() ?? undefined) : undefined,
          endDate: item.listingType === 'rental' ? (dates.endDate?.toISOString() ?? undefined) : undefined,
        })),
      })

      if (!result.success || result.orderId === undefined) {
        setSubmitError(translateCheckoutError({ code: result.errorCode ?? 'UNKNOWN', data: result.errorData }))
        return
      }

      clearCart()
      setSuccess({ orderId: result.orderId, startDate: dates.startDate, endDate: dates.endDate })
    } catch {
      setSubmitError(translateCheckoutError({ code: 'UNKNOWN' }))
    } finally {
      setSubmitting(false)
    }
  }

  const readyToSubmit = Boolean(name.trim() && phone.trim() && agreeData && agreeTerms)
  const submitLabel = submitting
    ? 'Отправляем…'
    : !name.trim() || !phone.trim()
      ? 'Заполните имя и телефон'
      : !agreeData || !agreeTerms
        ? 'Подтвердите согласия'
        : 'Отправить заявку'

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-5 rounded-3xl border border-border bg-card p-[26px_28px]">
        <h1 className="m-0 text-[clamp(30px,3.8vw,52px)] font-medium leading-none tracking-[-0.045em]">Заявка на аренду</h1>
        <span className="text-[13px] text-subtle">
          {cart.reduce((s, i) => s + getDisplayQuantity(i), 0)} поз. {hasDates && `· ${formatShifts(days)}`}
        </span>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        <div className="flex flex-col gap-3.5 lg:col-span-7">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">01 — Позиции</div>
            <div className="mt-1">
              {cart.map((item) => {
                const status = getItemAvailability(item)
                const short = isShort(status, item)
                const resolvedQuantity = resolveAcknowledgedQuantity(item, status, dates, acknowledgedShortfalls)
                const acknowledged = resolvedQuantity !== null
                // B2 (N4): getDisplayLineTotal is exactly 0 for a rental
                // line with no dates chosen (calculateLineTotal's own
                // documented behavior) — not a real price. Show the rate
                // (price × quantity, the same per-line figure B3's «Ставка
                // за смену» row sums across the whole cart) marked per-day
                // instead of printing that 0. A sale line has no date
                // dimension — calculateLineTotal prices it unconditionally —
                // so it keeps using getDisplayLineTotal below regardless of
                // hasDates; only an un-dated rental line takes this branch.
                const showRateOnly = item.listingType === 'rental' && !hasDates
                return (
                  <div
                    key={item.productId}
                    className="mx-[-14px] rounded-[18px] px-3.5 py-4.5 transition-colors duration-240 ease-expo hover:bg-muted"
                    style={{ animation: 'bnIn 560ms var(--ease-expo) both' }}
                  >
                    {/*
                      Finding 1 (2026-09-11 live pass over block B, on top of
                      B2): at >=640px (Tailwind's default `sm`) this is still
                      the original 3-column grid, unchanged. Below that, the
                      `auto`-sized price column (long at a high rate — "158
                      000 ₽ / СУТКИ" — or a large dated total, "790 000 ₽")
                      squeezed the `1fr` title column down far enough that a
                      wrapped title visually overlapped the price text at
                      360px — reproduced for both the B2 rate branch and the
                      pre-existing dated-total branch below, so both take the
                      same fix; neither is more correct to leave alone.
                      Genuinely can't always fit one line at 360px (a long
                      title *and* a 6-figure price both want real width), so
                      below `sm` the price stacks under the image+title row
                      instead of sharing it — `sm:contents` on the wrapper
                      dissolves it back into the 3 grid columns at `sm` and up
                      without a second, parallel set of "mobile" markup to
                      keep in sync by hand.
                    */}
                    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[92px_1fr_auto] sm:items-start sm:gap-4">
                      <div className="flex gap-3 sm:contents">
                        {/* C4 (design_handoff_swiss_bento/08-instruction.md,
                            G3): cart thumbnail — this Link's w-[92px]
                            h-[72px] is a fixed size at every breakpoint (the
                            parent's flex-col/sm:grid layout switch only
                            changes how the row is arranged, not this box's
                            own dimensions), so plain width/height replaces
                            fill — no `sizes` needed for a genuinely
                            fixed-size image. */}
                        <Link href={`/product/${item.productId}`} className="h-[72px] w-[92px] shrink-0 overflow-hidden rounded-[14px] bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)]">
                          {item.imageUrl && (
                            <Image src={item.imageUrl} alt={item.title} width={92} height={72} className="h-full w-full object-cover" />
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={`/product/${item.productId}`} className="border-none text-[17.5px] font-medium leading-tight tracking-[-0.025em] text-foreground hover:text-accent">
                            {item.title}
                          </Link>
                          <div className="mt-1.5 text-[12.5px] text-subtle">{item.unit} · {formatCurrency(item.price)}</div>
                          <div className="mt-2.5 flex items-center gap-3.5">
                            <div className="flex items-center rounded-full bg-[#EFEEEB] p-[3px]">
                              <button type="button" onClick={() => setItemQuantity(item.productId, item.quantity - 1)} className="flex h-7 w-[30px] items-center justify-center rounded-full text-[15px] transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground">−</button>
                              <span key={item.quantity} className="min-w-8 text-center text-[13.5px] font-semibold" style={{ animation: 'bnPop 380ms var(--ease-expo) both' }}>{item.quantity}</span>
                              <button type="button" disabled={item.quantity >= (status.kind === 'known' ? Math.min(status.available, MAX_CART_ITEM_QUANTITY) : MAX_CART_ITEM_QUANTITY)} onClick={() => setItemQuantity(item.productId, item.quantity + 1)} className="flex h-7 w-[30px] items-center justify-center rounded-full text-[15px] transition-colors duration-240 ease-expo hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-30">+</button>
                            </div>
                            <button type="button" onClick={() => removeFromCart(item.productId)} className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle transition-colors duration-240 ease-expo hover:text-accent">
                              Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="whitespace-nowrap text-[20px] font-semibold tracking-[-0.03em]">
                          {showRateOnly ? (
                            <>
                              {formatCurrency(item.price * getDisplayQuantity(item))}
                              {/* Same "/ сутки" convention as ProductPurchasePanel's own
                                  per-unit price display — uppercase, wide tracking, muted. */}
                              <span className="ml-1.5 text-[11px] font-normal uppercase tracking-[0.1em] text-subtle">/ сутки</span>
                            </>
                          ) : (
                            formatCurrency(getDisplayLineTotal(item))
                          )}
                        </div>
                        {showRateOnly && <div className="mt-1.5 text-[11px] text-subtle">даты не выбраны</div>}
                        {status.kind === 'loading' && <div className="mt-1.5 text-[11px] text-subtle">проверяем…</div>}
                        {status.kind === 'known' && !short && <div className="mt-1.5 text-[11px] text-subtle">свободно на ваши даты</div>}
                        {status.kind === 'missing' && <div className="mt-1.5 text-[11px] text-destructive">товар недоступен</div>}
                        {/* Money-display follow-up to A4/N10 review finding 1: an
                            acknowledged short line's price above is already for
                            resolvedQuantity, not item.quantity — say so right next
                            to the number, not only in the explanatory paragraph
                            below, so the smaller quantity this line actually bills
                            at is never silent. */}
                        {acknowledged && resolvedQuantity !== null && resolvedQuantity !== item.quantity && (
                          <div className="mt-1.5 text-[11px] text-subtle">цена за {pluralUnits(resolvedQuantity)}</div>
                        )}
                      </div>
                    </div>

                    {status.kind === 'error' && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] text-destructive">
                        <span>Не удалось проверить наличие «{item.title}» на эти даты.</span>
                        <button
                          type="button"
                          onClick={() => setRetryNonce((n) => n + 1)}
                          className="shrink-0 rounded-full bg-destructive px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-destructive-foreground transition-colors duration-240 ease-expo hover:opacity-90"
                        >
                          Повторить
                        </button>
                      </div>
                    )}

                    {status.kind === 'missing' && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-bg px-4 py-3 text-[12.5px] text-destructive">
                        <span>«{item.title}» больше недоступен для аренды — товар удалён или снят с публикации. Оформить эту позицию нельзя.</span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="shrink-0 rounded-full bg-destructive px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-destructive-foreground transition-colors duration-240 ease-expo hover:opacity-90"
                        >
                          Убрать
                        </button>
                      </div>
                    )}

                    {short && (
                      <div className={`mt-3 rounded-xl px-4 py-3 text-[12.5px] ${acknowledged ? 'bg-muted text-muted-foreground' : 'bg-danger-bg text-destructive'}`}>
                        <p>
                          «{item.title}»: свободно {pluralUnits(status.available)}, а в заявке {item.quantity}.
                          {status.available === 0 ? (
                            ' Эта позиция недоступна на выбранные даты — уберите её или выберите другие даты.'
                          ) : resolvedQuantity !== null ? (
                            ` В заявку уйдёт ${pluralUnits(resolvedQuantity)}, по остальным ${pluralUnits(item.quantity - resolvedQuantity)} свяжется менеджер.`
                          ) : null}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.productId)}
                            className="rounded-full bg-white/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors duration-240 ease-expo hover:bg-white"
                          >
                            Убрать
                          </button>
                          <button
                            type="button"
                            onClick={() => datePickerRef.current?.open('from')}
                            className="rounded-full bg-white/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors duration-240 ease-expo hover:bg-white"
                          >
                            Изменить даты
                          </button>
                          {status.available > 0 && (
                            <button
                              type="button"
                              aria-pressed={acknowledged}
                              onClick={() =>
                                setAcknowledgedShortfalls((prev) => {
                                  const key = shortfallKey(item, dates, status.available)
                                  if (prev[item.productId] === key) {
                                    return Object.fromEntries(Object.entries(prev).filter(([id]) => id !== String(item.productId)))
                                  }
                                  return { ...prev, [item.productId]: key }
                                })
                              }
                              className={`rounded-full px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors duration-240 ease-expo ${
                                acknowledged ? 'bg-primary text-primary-foreground' : 'bg-white/70 hover:bg-white'
                              }`}
                            >
                              {acknowledged
                                ? `✓ В заявке ${pluralUnits(status.available)} — остальное по звонку`
                                : 'Оставить часть, остальное — по звонку'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {hasRentalItems && (
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">02 — Даты и время</div>
              <p className="mt-1.5 text-[13px] text-subtle">Единый период для всего оборудования в заказе.</p>
              <div className="mt-3">
                <RentalDatePicker ref={datePickerRef} variant="boxes" context="checkout" />
              </div>
            </div>
          )}

          <form id="checkout-form" onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">03 — Контакты</div>

            {submitError && (
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger-bg px-4 py-3 text-[13.5px] text-destructive">
                <span>{submitError.message}</span>
                {submitError.canChangeDates && (
                  <button
                    type="button"
                    onClick={() => datePickerRef.current?.open('from')}
                    className="shrink-0 rounded-full bg-destructive px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-destructive-foreground transition-colors duration-240 ease-expo hover:opacity-90"
                  >
                    Изменить даты
                  </button>
                )}
              </div>
            )}

            {displayErrors.length > 0 && (
              <div className="mt-3.5 rounded-xl bg-danger-bg px-4 py-3 text-[13.5px] text-destructive">
                <ul className="list-inside list-disc space-y-0.5">
                  {displayErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Имя">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Как к вам обращаться" className={inputClass} />
              </Field>
              <Field label="Телефон">
                <input type="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="+7 (___) ___-__-__" className={inputClass} />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputClass} />
              </Field>
              <Field label="Telegram / WhatsApp">
                <input type="text" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@username" className={inputClass} />
              </Field>
            </div>

            <div className="mt-3.5">
              <Field label="Комментарий">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Что снимаете, нужна ли доставка"
                  className={`${inputClass} resize-y py-3 leading-[1.45]`}
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-col gap-1">
              <CheckBox
                id="agree-data"
                checked={agreeData}
                onChange={setAgreeData}
                label={
                  <>
                    Согласен на{' '}
                    <a href="/privacy-policy" target="_blank" className="text-accent hover:underline">обработку персональных данных</a>
                    {' '}для оформления заявки на аренду.
                  </>
                }
              />
              <CheckBox
                id="agree-terms"
                checked={agreeTerms}
                onChange={setAgreeTerms}
                label={
                  <>
                    Ознакомлен с{' '}
                    <a href="/user-agreement" target="_blank" className="text-accent hover:underline">условиями аренды</a>.
                  </>
                }
              />
            </div>
          </form>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-[96px] rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">Итог</div>
            <div className="mt-2.5">
              {/* B3 order (design_handoff_swiss_bento/08-instruction.md,
                  audit N3): Ставка за смену → Срок → Позиций → К оплате —
                  not the old Позиций/Срок/«Аренда за смену» order, and not
                  the old label, which claimed to be a per-shift rate while
                  actually printing the full days-and-quantity total. */}
              {hasRentalItems && <div className="flex items-baseline justify-between py-2.5 text-[13.5px]"><span className="text-subtle">Ставка за смену</span><span className="font-semibold">{formatCurrency(rate)}</span></div>}
              {/* Finding 3 (2026-09-11 live pass over block B): with a mixed
                  rental+sale cart and no dates, «Ставка за смену» and
                  «Покупка» used to sit back to back, both bold right-aligned
                  figures, with «Срок» hidden entirely (this row used to be
                  gated on hasDates) — nothing on screen explained that the
                  rate still needs multiplying by a still-unknown day count
                  before it means anything, inviting a naive "just add the
                  two numbers" read. Now this row always renders whenever the
                  cart has a rental line, with an explicit "даты не выбраны"
                  value (the same copy the per-item rate-only branch above
                  already uses) standing in the exact spot «Срок» will show a
                  real day count once dates are picked — it's an existing row
                  gaining a fallback value, not a new row invented for this
                  state, and it physically separates the two prices so
                  «Покупка» no longer reads as sitting right next to «Ставка
                  за смену» with nothing in between. Gated on hasRentalItems,
                  not hasDates: a sale-only cart still has no «Срок» to show
                  at all, dates or not. */}
              {hasRentalItems && (
                <div className="flex items-baseline justify-between py-2.5 text-[13.5px]">
                  <span className="text-subtle">Срок</span>
                  <span className={hasDates ? undefined : 'text-subtle'}>{hasDates ? formatShifts(days) : 'даты не выбраны'}</span>
                </div>
              )}
              {hasSaleItems && <div className="flex items-baseline justify-between py-2.5 text-[13.5px]"><span className="text-subtle">Покупка</span><span className="font-semibold">{formatCurrency(saleTotal)}</span></div>}
              <div className="flex items-baseline justify-between py-2.5 text-[13.5px]"><span className="text-subtle">Позиций</span><span>{cart.reduce((s, i) => s + getDisplayQuantity(i), 0)} поз.</span></div>
              <div className="mt-2.5 flex items-baseline justify-between rounded-[18px] bg-muted px-[18px] py-4.5">
                {canComputeTotal ? (
                  <>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.13em]">К оплате</span>
                    <span key={total} className="text-[32px] font-semibold tracking-[-0.04em]" style={{ animation: 'bnPop 380ms var(--ease-expo) both' }}>{formatCurrency(total)}</span>
                  </>
                ) : (
                  // B2 (N4): no dates yet, so the payable total is genuinely
                  // unknown, not 0 — point at the one action that resolves
                  // it (same picker the "02 — Даты и время" section below
                  // already renders, reachable there too; this is a second,
                  // more prominent entry point right where the customer is
                  // looking for a total) instead of printing a number that
                  // would be a lie.
                  <button
                    type="button"
                    onClick={() => datePickerRef.current?.open('from')}
                    className="w-full text-left text-[13.5px] font-medium text-subtle transition-colors duration-240 ease-expo hover:text-foreground"
                  >
                    Выберите даты, чтобы рассчитать
                  </button>
                )}
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className={`mt-4.5 h-14 w-full rounded-full text-[11.5px] font-semibold uppercase tracking-[0.13em] transition-colors duration-240 ease-expo active:scale-[0.98] ${
                readyToSubmit || submitting ? 'bg-primary text-primary-foreground hover:bg-primary-hover' : 'cursor-not-allowed bg-muted text-faint'
              }`}
            >
              {submitLabel}
            </button>
            <p className="mt-3 text-center text-[12px] leading-[1.5] text-subtle">
              Перезвоним в течение 15 минут в рабочее время и подтвердим бронь. Оплата — при получении.
            </p>

            <div className="mt-4.5 flex flex-col gap-2.5 border-t border-border pt-4">
              <div className="text-[12.5px] text-subtle">Или свяжитесь с нами иначе:</div>
              <div className="flex gap-2">
                <a href="https://t.me/Playbackrental_admin" target="_blank" rel="noopener noreferrer" className="btn-outline flex h-10 flex-1 text-[11px]">Telegram</a>
                <a href="tel:+79965270026" className="btn-outline flex h-10 flex-1 text-[11px]">Позвонить</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
