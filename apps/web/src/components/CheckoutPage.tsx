import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import { $cart, $cartTotal, getLineTotal, removeFromCart, setItemQuantity, clearCart } from '../stores/cart'
import { $selectedDates } from '../stores/dates'
import { calculateRentalDays, formatCurrency } from '../lib/pricing'
import { createOrder, createOrderItem, deleteOrderItem, submitOrder, getRentalAvailabilityBulk, PayloadApiError } from '../lib/payload'
import RentalDatePicker from './RentalDatePicker'

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'mt-2 h-12 w-full rounded-[14px] border border-input bg-muted-well px-4 text-[15px] outline-none transition-[border-color,background-color] duration-200 focus:border-foreground focus:bg-white'

function CheckBox({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: React.ReactNode }) {
  return (
    <div onClick={onClick} className="-mx-3 flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition-colors duration-200 hover:bg-muted">
      <span
        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[12px] font-bold transition-[background-color,color,transform] duration-200"
        style={checked ? { background: '#0A0A0A', color: '#fff', transform: 'scale(1.06)' } : { background: '#F0EFEC', color: 'transparent' }}
      >
        ✓
      </span>
      <span className="text-[12.5px] leading-[1.45] text-muted-foreground">{label}</span>
    </div>
  )
}

export default function CheckoutPage() {
  const storeCart = useStore($cart)
  const storeTotal = useStore($cartTotal)
  const storeDates = useStore($selectedDates)
  // $cart (localStorage) and $selectedDates (sessionStorage) can both
  // legitimately differ between the server render and the client's first
  // (hydration) render — gate on mounted, same pattern as
  // RentalDatePicker/ProductPurchasePanel/CartBadge. This matters more here
  // than most call sites: cart.length === 0 picks an entirely different
  // top-level branch to render (empty-state vs. the real form), which is
  // exactly the kind of structural mismatch React's hydration check catches.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const cart = mounted ? storeCart : []
  const total = mounted ? storeTotal : 0
  const dates = mounted ? storeDates : { startDate: null, endDate: null }

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [comment, setComment] = useState('')
  const [agreeData, setAgreeData] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [availability, setAvailability] = useState<Record<number, number>>({})

  const hasRentalItems = cart.some((i) => i.listingType === 'rental')
  const hasDates = Boolean(dates.startDate && dates.endDate)
  const days = calculateRentalDays(dates.startDate ?? undefined, dates.endDate ?? undefined)

  useEffect(() => {
    if (!hasDates) {
      setAvailability({})
      return
    }
    const rentalIds = cart.filter((i) => i.listingType === 'rental').map((i) => i.productId)
    if (rentalIds.length === 0) return
    let cancelled = false
    getRentalAvailabilityBulk(rentalIds, dates.startDate ?? undefined, dates.endDate ?? undefined)
      .then((res) => {
        if (!cancelled) setAvailability(res)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDates, dates.startDate?.getTime(), dates.endDate?.getTime(), cart.map((i) => i.productId).join(',')])

  if (success) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-border bg-card py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-8 w-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-6 text-[28px] font-medium tracking-[-0.03em]">Заявка отправлена!</h1>
        <p className="mt-3 max-w-[420px] text-[14.5px] text-muted-foreground">
          Мы получили вашу заявку на бронирование. Наш менеджер свяжется с вами в ближайшее время для подтверждения.
        </p>
        <a href="/catalog" className="btn-primary mt-8 h-12 px-6 text-[11px]">Вернуться в каталог</a>
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
        <a href="/catalog" className="btn-primary mt-8 h-12 px-6 text-[11px]">Смотреть каталог</a>
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
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (errs.length > 0) return

    setSubmitting(true)
    try {
      const order = await createOrder({
        customerName: name.trim(),
        customerEmail: email.trim(),
        customerPhone: phone,
        notes: [telegram.trim() && `Telegram/WhatsApp: ${telegram.trim()}`, comment.trim()].filter(Boolean).join('\n') || undefined,
      })

      // If a later line item fails (e.g. someone else just took the last unit),
      // don't leave the earlier ones dangling on an order that never gets
      // submitted — checkout can't delete the order shell itself (admin-only
      // by design, since it holds customer PII), but it can and should clean
      // up the orderItems it did manage to create before surfacing the error.
      const createdItemIds: number[] = []
      try {
        for (const item of cart) {
          const created = await createOrderItem({
            order: order.id,
            product: item.productId,
            quantity: item.quantity,
            startDate: item.listingType === 'rental' ? dates.startDate?.toISOString() : undefined,
            endDate: item.listingType === 'rental' ? dates.endDate?.toISOString() : undefined,
          })
          createdItemIds.push(created.id)
        }
      } catch (itemError) {
        await Promise.all(createdItemIds.map((id) => deleteOrderItem(id).catch(() => {})))
        throw itemError
      }

      await submitOrder(order.id, order.submitToken!)
      clearCart()
      setSuccess(true)
    } catch (error) {
      const message = error instanceof PayloadApiError ? error.message : 'Не удалось оформить заказ. Попробуйте ещё раз.'
      setErrors([message])
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
          {cart.reduce((s, i) => s + i.quantity, 0)} поз. {hasDates && `· ${days} ${days === 1 ? 'смена' : 'смены'}`}
        </span>
      </div>

      <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        <div className="flex flex-col gap-3.5 lg:col-span-7">
          <div className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">01 — Позиции</div>
            <div className="mt-1">
              {cart.map((item) => {
                const avail = item.listingType === 'rental' ? availability[item.productId] : undefined
                return (
                  <div
                    key={item.productId}
                    className="mx-[-14px] grid grid-cols-[92px_1fr_auto] items-start gap-4 rounded-[18px] px-3.5 py-4.5 transition-colors duration-200 hover:bg-muted"
                    style={{ animation: 'bnIn 560ms cubic-bezier(0.16,1,0.3,1) both' }}
                  >
                    <a href={`/product/${item.productId}`} className="h-[72px] w-[92px] overflow-hidden rounded-[14px] bg-[linear-gradient(150deg,#e6e4e0,#ded9d1)]">
                      {item.imageUrl && <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />}
                    </a>
                    <div className="min-w-0">
                      <a href={`/product/${item.productId}`} className="border-none text-[17.5px] font-medium leading-tight tracking-[-0.025em] text-foreground hover:text-accent">
                        {item.title}
                      </a>
                      <div className="mt-1.5 text-[12.5px] text-subtle">{item.unit} · {formatCurrency(item.price)}</div>
                      <div className="mt-2.5 flex items-center gap-3.5">
                        <div className="flex items-center rounded-full bg-[#EFEEEB] p-[3px]">
                          <button type="button" onClick={() => setItemQuantity(item.productId, item.quantity - 1)} className="flex h-7 w-[30px] items-center justify-center rounded-full text-[15px] transition-colors duration-200 hover:bg-primary hover:text-primary-foreground">−</button>
                          <span className="min-w-8 text-center text-[13.5px] font-semibold">{item.quantity}</span>
                          <button type="button" onClick={() => setItemQuantity(item.productId, item.quantity + 1)} className="flex h-7 w-[30px] items-center justify-center rounded-full text-[15px] transition-colors duration-200 hover:bg-primary hover:text-primary-foreground">+</button>
                        </div>
                        <button type="button" onClick={() => removeFromCart(item.productId)} className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-subtle transition-colors duration-200 hover:text-accent">
                          Удалить
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="whitespace-nowrap text-[20px] font-semibold tracking-[-0.03em]">{formatCurrency(getLineTotal(item))}</div>
                      {item.listingType === 'rental' && hasDates && (
                        <div className={`mt-1.5 text-[11px] ${avail !== undefined && avail <= 0 ? 'text-destructive' : 'text-subtle'}`}>
                          {avail !== undefined && avail <= 0 ? 'проверим при звонке' : 'свободно на ваши даты'}
                        </div>
                      )}
                    </div>
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
                <RentalDatePicker variant="boxes" />
              </div>
            </div>
          )}

          <form id="checkout-form" onSubmit={handleSubmit} className="rounded-3xl border border-border bg-card p-6">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-subtle">03 — Контакты</div>

            {errors.length > 0 && (
              <div className="mt-3.5 rounded-xl bg-danger-bg px-4 py-3 text-[13.5px] text-destructive">
                <ul className="list-inside list-disc space-y-0.5">
                  {errors.map((err) => (
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
                checked={agreeData}
                onClick={() => setAgreeData((v) => !v)}
                label={
                  <>
                    Согласен на{' '}
                    <a href="/privacy-policy" target="_blank" className="text-accent hover:underline">обработку персональных данных</a>
                    {' '}для оформления заявки на аренду.
                  </>
                }
              />
              <CheckBox
                checked={agreeTerms}
                onClick={() => setAgreeTerms((v) => !v)}
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
              <div className="flex items-baseline justify-between py-2.5 text-[13.5px]"><span className="text-subtle">Позиций</span><span>{cart.reduce((s, i) => s + i.quantity, 0)} поз.</span></div>
              {hasDates && <div className="flex items-baseline justify-between py-2.5 text-[13.5px]"><span className="text-subtle">Срок</span><span>{days} {days === 1 ? 'смена' : 'смены'}</span></div>}
              <div className="flex items-baseline justify-between py-2.5 text-[13.5px]"><span className="text-subtle">Аренда за смену</span><span className="font-semibold">{formatCurrency(total)}</span></div>
              <div className="mt-2.5 flex items-baseline justify-between rounded-[18px] bg-muted px-[18px] py-4.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.13em]">К оплате</span>
                <span key={total} className="text-[32px] font-semibold tracking-[-0.04em]" style={{ animation: 'bnPop 380ms cubic-bezier(0.16,1,0.3,1) both' }}>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className={`mt-4.5 h-14 w-full rounded-full text-[11.5px] font-semibold uppercase tracking-[0.13em] transition-colors duration-200 active:scale-[0.98] ${
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
