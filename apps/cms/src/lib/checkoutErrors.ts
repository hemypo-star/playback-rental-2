// Single translation point for checkout errors (design_handoff_swiss_bento/
// 08-instruction.md A3, audit finding G5). The beforeValidate hook
// (collections/OrderItems.ts) and lib/rental/submitOrder.ts throw APIError/
// SubmitOrderError with an English `message` (kept English on purpose — it's
// what shows up in server logs) plus a machine-readable `code` and whatever
// structured `data` the client needs (product title, requested/available
// quantity). Nothing downstream of here should ever read `error.message`
// for display — checkout/actions.ts converts the thrown error into a
// CheckoutErrorCode + CheckoutErrorData, and this module turns that into the
// Russian text (and whether an "изменить даты" action applies) the customer
// actually sees. Keeping this in one module, instead of inline in
// CheckoutPage.tsx, is what makes it possible to audit "does every checkout
// error have Russian text" by reading one file.
export type CheckoutErrorCode =
  | 'RENTAL_DATES_INVALID'
  | 'RENTAL_QUANTITY_UNAVAILABLE'
  | 'SALE_QUANTITY_UNAVAILABLE'
  | 'ORDER_NOT_FOUND'
  | 'ORDER_ALREADY_SUBMITTED'
  | 'ORDER_HAS_NO_ITEMS'
  // A2 (design_handoff_swiss_bento/08-instruction.md) — thrown when
  // checkout/actions.ts's own IP or phone rate-limit check
  // (lib/security/rateLimit.ts) rejects the attempt, before any order is
  // created. Also reused (not re-derived) by the contact-notification
  // endpoint's own rate limit for the same Russian wording — see
  // ContactForm.tsx.
  | 'RATE_LIMITED'
  | 'UNKNOWN'

// RENTAL_DATES_INVALID covers three real throw sites in OrderItems.ts's
// beforeValidate hook: dates missing entirely, a return date earlier than
// the pickup date (a backwards range — same-calendar-day is valid since
// A1, see that throw site's own comment), and a pickup date on an earlier
// calendar day than today. `reason` distinguishes them so the Russian text
// can be specific instead of a generic "check your dates". There is no RENTAL_MIN_DURATION here on purpose: A1 turned the
// old "minimum one day" rejection into a Math.max(1, ...) floor in
// lib/rental/pricing.ts, so nothing in this codebase rejects a too-short
// rental anymore — a too-short range is priced as one day, not an error.
// Adding a code with no throw site would be inventing a rejection path A1
// deliberately removed, which isn't this task's job.
export interface CheckoutErrorData {
  productTitle?: string
  requested?: number
  available?: number
  reason?: 'missing' | 'backwards' | 'past'
}

export interface CheckoutErrorInfo {
  code: CheckoutErrorCode
  data?: CheckoutErrorData
}

export interface TranslatedCheckoutError {
  message: string
  // Only date/availability errors are fixable by reopening the date picker
  // — a sale-quantity shortfall or a submit-time system error isn't, so the
  // client shouldn't offer a "изменить даты" button for those.
  canChangeDates: boolean
}

// Exported so CheckoutPage's pre-submit availability warning (A4,
// design_handoff_swiss_bento/08-instruction.md) can match this module's
// wording exactly ("свободно N шт.") instead of re-deriving its own copy of
// the same "N шт." formatting.
export function pluralUnits(n: number): string {
  // Russian plural of "штука" (unit): 1 шт., 2-4 шт., 5+ шт. — "шт." itself
  // doesn't inflect, but this keeps the surrounding number/word agreement
  // correct if that ever changes. Kept intentionally simple: full ru
  // pluralization (B5) is out of scope for A3.
  return `${n} шт.`
}

export function translateCheckoutError({ code, data }: CheckoutErrorInfo): TranslatedCheckoutError {
  switch (code) {
    case 'RENTAL_DATES_INVALID':
      if (data?.reason === 'past') {
        return {
          message: 'Дата выдачи уже прошла. Выберите дату не раньше сегодняшней.',
          canChangeDates: true,
        }
      }
      if (data?.reason === 'backwards') {
        return {
          message: 'Дата возврата раньше даты выдачи. Выберите даты ещё раз.',
          canChangeDates: true,
        }
      }
      return {
        message: 'Выберите даты аренды, чтобы оформить заявку.',
        canChangeDates: true,
      }
    case 'RENTAL_QUANTITY_UNAVAILABLE': {
      const title = data?.productTitle ?? 'Товар'
      const available = data?.available ?? 0
      const requested = data?.requested ?? 0
      return {
        message: `«${title}»: свободно ${pluralUnits(available)}, а в заявке ${requested}. Уменьшите количество или выберите другие даты.`,
        canChangeDates: true,
      }
    }
    case 'SALE_QUANTITY_UNAVAILABLE': {
      const title = data?.productTitle ?? 'Товар'
      const available = data?.available ?? 0
      const requested = data?.requested ?? 0
      return {
        message: `«${title}»: в наличии ${pluralUnits(available)}, а в заявке ${requested}. Уменьшите количество.`,
        canChangeDates: false,
      }
    }
    case 'ORDER_ALREADY_SUBMITTED':
      return {
        message: 'Эта заявка уже отправлена — повторная отправка не требуется.',
        canChangeDates: false,
      }
    case 'RATE_LIMITED':
      return {
        message: 'Слишком много заявок с этого номера или адреса за последнее время. Подождите немного и попробуйте снова, либо позвоните нам напрямую.',
        canChangeDates: false,
      }
    case 'ORDER_NOT_FOUND':
    case 'ORDER_HAS_NO_ITEMS':
    case 'UNKNOWN':
      return {
        message: 'Не удалось оформить заказ. Попробуйте ещё раз.',
        canChangeDates: false,
      }
  }
  // No `default:` above, on purpose. With every member of CheckoutErrorCode
  // handled explicitly, adding a code to that union without adding a case
  // here fails this assignment at compile time — which is what makes the
  // header comment's "audit it by reading one file" claim enforced rather
  // than merely intended. The fallback below still runs for a code that only
  // exists at runtime (an older client, a hand-crafted payload), so an
  // unknown code degrades to Russian text rather than throwing.
  const unhandled: never = code
  void unhandled
  return {
    message: 'Не удалось оформить заказ. Попробуйте ещё раз.',
    canChangeDates: false,
  }
}

// Extracts the {code, data} pair from whatever submitCheckout's try/catch
// caught. APIError (thrown by OrderItems.ts's beforeValidate hook) carries
// it in its `data` object (the third constructor argument); SubmitOrderError
// (lib/rental/submitOrder.ts) carries it in its own `code` field. Anything
// else (a network/DB hiccup, not a validation rejection) becomes UNKNOWN —
// same "only surface a Payload-originated error's own text" distinction the
// old REST client's PayloadApiError-only check made, just against a code
// now instead of a raw message.
export function checkoutErrorInfoFromUnknown(error: unknown): CheckoutErrorInfo {
  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data
    if (data && typeof data === 'object' && 'code' in data) {
      const code = (data as { code?: unknown }).code
      if (typeof code === 'string' && isCheckoutErrorCode(code)) {
        return { code, data: pickErrorData(data) }
      }
    }
    const directCode = (error as { code?: unknown }).code
    if (typeof directCode === 'string' && isCheckoutErrorCode(directCode)) {
      return { code: directCode }
    }
  }
  return { code: 'UNKNOWN' }
}

// Copies out only the fields the customer-facing text actually renders,
// rather than casting the caught error's whole `data` object across the
// server -> browser boundary. Everything thrown today already carries just
// these four, so this changes no behaviour; it's here so that a future throw
// site attaching a debug payload to an existing code can't quietly ship it to
// the browser along with the message. A cast would not have caught that: it
// is a type-level assertion, and strips nothing at runtime.
function pickErrorData(data: object): CheckoutErrorData {
  const d = data as CheckoutErrorData
  return {
    productTitle: typeof d.productTitle === 'string' ? d.productTitle : undefined,
    requested: typeof d.requested === 'number' ? d.requested : undefined,
    available: typeof d.available === 'number' ? d.available : undefined,
    reason: d.reason === 'missing' || d.reason === 'backwards' || d.reason === 'past' ? d.reason : undefined,
  }
}

function isCheckoutErrorCode(value: string): value is CheckoutErrorCode {
  return (
    value === 'RENTAL_DATES_INVALID' ||
    value === 'RENTAL_QUANTITY_UNAVAILABLE' ||
    value === 'SALE_QUANTITY_UNAVAILABLE' ||
    value === 'ORDER_NOT_FOUND' ||
    value === 'ORDER_ALREADY_SUBMITTED' ||
    value === 'ORDER_HAS_NO_ITEMS' ||
    value === 'RATE_LIMITED' ||
    value === 'UNKNOWN'
  )
}
