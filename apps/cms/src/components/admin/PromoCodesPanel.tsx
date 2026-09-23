'use client'

// Промокоды (backlog item 5, docs/ROADMAP-2.0.md) — single-page, inline-
// editing panel, per the owner's own correction on this screen: NOT the
// categories/promotions list+[id]-detail pattern this app otherwise uses
// for catalog CRUD. Follows UsersPanel.tsx's precedent instead — one client
// panel listing and mutating rows in place, with its own actions.ts beside
// it — since that's this repo's own established shape for exactly this
// kind of "manage a short admin-only list on one page" screen.
import { useEffect, useId, useRef, useState } from 'react'
import type { PromoCode } from '../../payload-types'
import { createPromoCode, deletePromoCode, updatePromoCode } from '../../app/(admin)/admin/promo-codes/actions'

type DiscountType = 'percent' | 'fixed'

interface Props {
  promoCodes: PromoCode[]
}

function formatValidUntil(iso: string | null | undefined): string {
  if (!iso) return 'бессрочно'
  return `до ${new Date(iso).toLocaleDateString('ru-RU')}`
}

// Shared icon-button shell — Navbar.tsx's mobile-menu toggle is this app's
// own precedent for "a bare icon needs a real tap target," not just a
// glyph with no padding (h-9 w-9, same size). focus-visible ring reuses the
// existing --color-ring token via the outline-ring utility (CheckBox's own
// precedent in CheckoutPage.tsx) — no new color/shadow for this.
const iconButtonClass =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-240 ease-expo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

export default function PromoCodesPanel({ promoCodes: initialPromoCodes }: Props) {
  const uid = useId()
  const [promoCodes, setPromoCodes] = useState(initialPromoCodes)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({})

  const [newCode, setNewCode] = useState('')
  const [newDiscountType, setNewDiscountType] = useState<DiscountType>('percent')
  const [newDiscountValue, setNewDiscountValue] = useState('10')
  // Backlog item 5 follow-up (minimum order threshold) — blank by design:
  // an empty string here means "let the server default it to discountValue"
  // (PromoCodes.ts's beforeValidate hook), not 0. Only a value the operator
  // actually typed is parsed and sent; leaving it blank sends nothing at
  // all, same distinction createPromoCode's own `!== undefined` check
  // relies on.
  const [newMinOrderAmount, setNewMinOrderAmount] = useState('')
  const [newValidUntil, setNewValidUntil] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  // Rollback targets must read the *current* committed value, not one
  // captured in an onBlur closure at the time a field was edited — same
  // reasoning, and same fix, as OrderDetailForm.tsx's itemsRef (block D1:
  // a fast double-edit of the same field could otherwise roll back to a
  // value from before either request landed, even after the first had
  // already committed a newer one server-side).
  const promoCodesRef = useRef(promoCodes)
  useEffect(() => {
    promoCodesRef.current = promoCodes
  }, [promoCodes])
  const committed = (id: number) => promoCodesRef.current.find((p) => p.id === id)

  const setRowError = (id: number, message: string | null) => {
    setRowErrors((prev) => {
      if (message === null) {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: message }
    })
  }

  const handleCreate = async () => {
    setError(null)
    setSuccess(null)
    const code = newCode.trim()
    const value = Number(newDiscountValue)
    if (!code) {
      setError('Укажите код')
      return
    }
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
      setError('Скидка должна быть целым числом не меньше 1')
      return
    }
    if (newDiscountType === 'percent' && value > 100) {
      setError('Процентная скидка не может быть больше 100')
      return
    }
    // Backlog item 5 follow-up (minimum order threshold) — blank stays
    // `undefined` (server defaults it to discountValue); anything typed is
    // validated the same way as the row's own onBlur check below, before
    // the round trip, not after.
    let minOrderAmount: number | undefined
    if (newMinOrderAmount.trim() !== '') {
      const parsedMin = Number(newMinOrderAmount)
      if (!Number.isFinite(parsedMin) || !Number.isInteger(parsedMin) || parsedMin < 0) {
        setError('Минимальная сумма заказа должна быть целым числом не меньше 0')
        return
      }
      minOrderAmount = parsedMin
    }
    setCreating(true)
    const result = await createPromoCode({
      code,
      discountType: newDiscountType,
      discountValue: value,
      minOrderAmount,
      validUntil: newValidUntil ? new Date(newValidUntil).toISOString() : null,
      description: newDescription.trim(),
    })
    setCreating(false)
    if (!result.success || result.id === undefined) {
      setError(result.error || 'Не удалось создать промокод')
      return
    }
    setPromoCodes((prev) => [
      {
        id: result.id!,
        code: code.toUpperCase(),
        discountType: newDiscountType,
        discountValue: value,
        // Mirrors the server's own default (PromoCodes.ts's beforeValidate
        // hook): a blank threshold ends up equal to discountValue, not 0.
        minOrderAmount: minOrderAmount ?? value,
        active: true,
        validUntil: newValidUntil ? new Date(newValidUntil).toISOString() : null,
        description: newDescription.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as PromoCode,
      ...prev,
    ])
    setNewCode('')
    setNewDiscountValue('10')
    setNewDiscountType('percent')
    setNewMinOrderAmount('')
    setNewValidUntil('')
    setNewDescription('')
    setSuccess(`Промокод «${code.toUpperCase()}» создан.`)
  }

  // Numeric-value edits commit on blur, not on every keystroke — block D1's
  // own finding, reused here: firing a Server Action per onChange means
  // typing "12" would write "1" first, and clearing the field would submit
  // Number('') = 0 as a real, persisted value. Validated client-side before
  // ever reaching the server: reject a non-integer, a value < 1, or (for a
  // percent code) a value over 100 — reverting the input to the last
  // committed value without a round trip, same shape as OrderDetailForm's
  // quantity field.
  const handleDiscountValueBlur = async (promo: PromoCode, raw: string) => {
    const value = Number(raw)
    const currentType = committed(promo.id)?.discountType ?? promo.discountType
    // Review finding B (fix round on claude/promo-codes): committed(promo.id)
    // is called LAZILY inside this closure, at rollback time, not captured
    // once up front the way this used to read — same reasoning and same
    // fix as OrderDetailForm.tsx's own commitItemField rollback. Reading it
    // eagerly here would revert to a snapshot from before either of two
    // fast, overlapping edits landed, even after the first had already
    // committed a newer value server-side.
    const revert = () => setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, discountValue: committed(promo.id)?.discountValue ?? promo.discountValue } : p)))
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
      setRowError(promo.id, 'Целое число, не меньше 1')
      revert()
      return
    }
    if (currentType === 'percent' && value > 100) {
      setRowError(promo.id, 'Для процента — не больше 100')
      revert()
      return
    }
    setRowError(promo.id, null)
    setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, discountValue: value } : p)))
    const result = await updatePromoCode(promo.id, { discountValue: value })
    if (!result.success) {
      setRowError(promo.id, result.error || 'Не удалось сохранить')
      revert()
    }
  }

  // Backlog item 5 follow-up (minimum order threshold) — same onBlur-commit
  // shape as handleDiscountValueBlur above, and the same lazily-read
  // revert() (review finding B): committed(promo.id) is called INSIDE the
  // closure, at rollback time, not captured up front, for the identical
  // fast-double-edit reason. No percent-vs-fixed coupling to check here
  // (unlike discountType/discountValue) — 0 is a valid, meaningful value
  // ("no threshold"), so the floor is 0, not 1.
  const handleMinOrderAmountBlur = async (promo: PromoCode, raw: string) => {
    const value = Number(raw)
    const revert = () =>
      setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, minOrderAmount: committed(promo.id)?.minOrderAmount ?? promo.minOrderAmount } : p)))
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
      setRowError(promo.id, 'Целое число, не меньше 0')
      revert()
      return
    }
    setRowError(promo.id, null)
    setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, minOrderAmount: value } : p)))
    const result = await updatePromoCode(promo.id, { minOrderAmount: value })
    if (!result.success) {
      setRowError(promo.id, result.error || 'Не удалось сохранить')
      revert()
    }
  }

  // Switching discountType is the one edit that can't be validated against
  // the OLD value in isolation — a 500₽ code switched to "%" would be an
  // invalid document (PromoCodes.ts's field-level validate caps percent at
  // 100), and committing discountType alone, separately from discountValue,
  // risks exactly that combination existing server-side even for a moment.
  // So: always send discountType and discountValue together, in one write,
  // and reject the switch outright (revert the select, explain why) rather
  // than silently reinterpreting the operator's existing number as
  // something they didn't type — silently rescaling 500 to 100 would be a
  // surprising, unasked-for edit to a value the operator set on purpose.
  const handleDiscountTypeChange = async (promo: PromoCode, nextType: DiscountType) => {
    const current = committed(promo.id) ?? promo
    if (nextType === 'percent' && current.discountValue > 100) {
      setRowError(promo.id, 'Сначала уменьшите скидку до 100 или меньше, затем смените тип на «%»')
      return
    }
    setRowError(promo.id, null)
    setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, discountType: nextType } : p)))
    const result = await updatePromoCode(promo.id, { discountType: nextType, discountValue: current.discountValue })
    if (!result.success) {
      setRowError(promo.id, result.error || 'Не удалось сохранить')
      // Review finding B: read the rollback target fresh from committed(),
      // not the `current` snapshot captured before the await — same fix as
      // handleDiscountValueBlur above.
      setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, discountType: committed(promo.id)?.discountType ?? promo.discountType } : p)))
    }
  }

  const handleToggleActive = async (promo: PromoCode) => {
    const nextActive = !promo.active
    setRowError(promo.id, null)
    setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, active: nextActive } : p)))
    const result = await updatePromoCode(promo.id, { active: nextActive })
    if (!result.success) {
      setRowError(promo.id, result.error || 'Не удалось сохранить')
      setPromoCodes((prev) => prev.map((p) => (p.id === promo.id ? { ...p, active: !nextActive } : p)))
    }
  }

  const handleDelete = async (promo: PromoCode) => {
    if (!confirm(`Удалить промокод «${promo.code}»?`)) return
    setError(null)
    const result = await deletePromoCode(promo.id)
    if (result.success) {
      setPromoCodes((prev) => prev.filter((p) => p.id !== promo.id))
    } else {
      setError(result.error || 'Не удалось удалить промокод')
    }
  }

  return (
    <>
      {error && <p className="rounded-2xl bg-status-alert-bg px-4 py-3 text-[13px] text-status-alert">{error}</p>}
      {success && <p className="rounded-2xl bg-status-ok-bg px-4 py-3 text-[13px] text-status-ok">{success}</p>}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Промокоды</div>
          <div className="mt-3 flex flex-col gap-2.5">
            {promoCodes.map((promo) => (
              // flex-wrap, not AdminMobileCard: these rows carry live
              // inline controls (not a link to a detail page — there is no
              // detail page anymore), so the "list row → separate mobile
              // card" pattern the other admin tables use doesn't apply
              // one-to-one. Wrapping the same controls onto a second line
              // below ~480px is the equivalent responsive treatment S7
              // itself asks for ("не оставлять горизонтальный скролл") —
              // an addition to the row's layout, not a second copy of it.
              <div key={promo.id} className="rounded-xl bg-muted px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="min-w-[90px] flex-1 truncate text-[13.5px] font-semibold">{promo.code}</span>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={promo.discountType === 'percent' ? 100 : undefined}
                      defaultValue={promo.discountValue}
                      onBlur={(e) => void handleDiscountValueBlur(promo, e.target.value)}
                      aria-label={`Скидка для промокода ${promo.code}`}
                      className="h-9 w-[76px] rounded-lg border border-input bg-white px-2 text-[13px] outline-none focus:border-foreground"
                    />
                    <select
                      value={promo.discountType}
                      onChange={(e) => void handleDiscountTypeChange(promo, e.target.value as DiscountType)}
                      aria-label={`Тип скидки для промокода ${promo.code}`}
                      className="h-9 rounded-lg border border-input bg-white px-2 text-[13px] outline-none focus:border-foreground"
                    >
                      <option value="percent">%</option>
                      <option value="fixed">₽</option>
                    </select>
                  </div>

                  {/* Backlog item 5 follow-up (minimum order threshold) —
                      same onBlur-commit input as the discount value above,
                      just its own field/handler. 0 is shown as a literal
                      "0" (not blank): after PromoCodes.ts's beforeValidate
                      hook runs, a row's minOrderAmount is never genuinely
                      unset, so there is no "blank" state left to represent
                      here — only "0 = no threshold" vs a real amount. */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11.5px] text-subtle">от</span>
                    <input
                      type="number"
                      min={0}
                      defaultValue={promo.minOrderAmount ?? 0}
                      onBlur={(e) => void handleMinOrderAmountBlur(promo, e.target.value)}
                      aria-label={`Минимальная сумма заказа для промокода ${promo.code}`}
                      className="h-9 w-[86px] rounded-lg border border-input bg-white px-2 text-[13px] outline-none focus:border-foreground"
                    />
                    <span className="text-[11.5px] text-subtle">₽</span>
                  </div>

                  <span className="text-[11.5px] text-subtle">{formatValidUntil(promo.validUntil)}</span>

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(promo)}
                      aria-pressed={Boolean(promo.active)}
                      aria-label={promo.active ? `Деактивировать промокод ${promo.code}` : `Активировать промокод ${promo.code}`}
                      className={`${iconButtonClass} ${promo.active ? 'bg-primary text-primary-foreground hover:bg-primary-hover' : 'bg-white text-subtle hover:bg-muted-well'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4.5 w-4.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(promo)}
                      aria-label={`Удалить промокод ${promo.code}`}
                      className={`${iconButtonClass} text-subtle hover:bg-danger-bg hover:text-accent`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {promo.description ? <div className="mt-1.5 truncate text-[11.5px] text-subtle">{promo.description}</div> : null}
                {rowErrors[promo.id] ? <div className="mt-1.5 text-[11.5px] text-destructive">{rowErrors[promo.id]}</div> : null}
              </div>
            ))}
            {promoCodes.length === 0 ? <div className="py-6 text-center text-[13px] text-subtle">Пока нет промокодов</div> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <div className="text-[10.5px] font-semibold tracking-[0.16em] text-subtle uppercase">Новый промокод</div>

          <label htmlFor={`${uid}-new-code`} className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Код</label>
          <input
            id={`${uid}-new-code`}
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="SUMMER10"
            className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] uppercase outline-none focus:border-foreground focus:bg-white"
          />

          <div className="mt-3 flex gap-2.5">
            <div className="flex-1">
              <label htmlFor={`${uid}-new-discount-value`} className="block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Скидка</label>
              <input
                id={`${uid}-new-discount-value`}
                type="number"
                min={1}
                max={newDiscountType === 'percent' ? 100 : undefined}
                value={newDiscountValue}
                onChange={(e) => setNewDiscountValue(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
              />
            </div>
            <div className="w-28">
              <label htmlFor={`${uid}-new-discount-type`} className="block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Тип</label>
              <select
                id={`${uid}-new-discount-type`}
                value={newDiscountType}
                onChange={(e) => {
                  const type = e.target.value as DiscountType
                  setNewDiscountType(type)
                  if (type === 'percent' && Number(newDiscountValue) > 100) setNewDiscountValue('100')
                }}
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
              >
                <option value="percent">Проценты</option>
                <option value="fixed">Рубли</option>
              </select>
            </div>
          </div>

          <label htmlFor={`${uid}-new-min-order-amount`} className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Мин. сумма заказа, ₽ (необязательно)</label>
          <input
            id={`${uid}-new-min-order-amount`}
            type="number"
            min={0}
            value={newMinOrderAmount}
            onChange={(e) => setNewMinOrderAmount(e.target.value)}
            placeholder={`по умолчанию — ${newDiscountValue || '0'}`}
            className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
          />

          <label htmlFor={`${uid}-new-valid-until`} className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Действует до (необязательно)</label>
          <input
            id={`${uid}-new-valid-until`}
            type="date"
            value={newValidUntil}
            onChange={(e) => setNewValidUntil(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
          />

          <label htmlFor={`${uid}-new-description`} className="mt-3 block text-[11px] font-bold uppercase tracking-[0.06em] text-subtle">Заметка (необязательно)</label>
          <input
            id={`${uid}-new-description`}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Летняя акция 2026"
            className="mt-1.5 h-11 w-full rounded-xl border border-input bg-muted-well px-3.5 text-[14px] outline-none focus:border-foreground focus:bg-white"
          />

          <button type="button" onClick={handleCreate} disabled={creating} className="btn-primary mt-4 w-full justify-center">
            Создать
          </button>
        </div>
      </div>
    </>
  )
}
