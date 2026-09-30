import type { CollectionConfig } from 'payload'

// Backlog item 5 (docs/ROADMAP-2.0.md). Prior art: commit ffbcf40 ("Add
// percentage-discount promo codes") — this collection's shape (code/active/
// validUntil/description, admin-only access, the uppercase-normalize hook)
// is reused near-verbatim from it; the field list gained discountType/
// discountValue (percent OR a fixed rouble amount, per the owner's actual
// requirement) in place of that commit's percent-only `percent` field. See
// OrderItems.ts's recalcOrderTotal for why the discount itself is no longer
// applied per line — that's the part of ffbcf40 that does NOT carry over.
export const PromoCodes: CollectionConfig = {
  slug: 'promoCodes',
  access: {
    // Not publicly readable — a promo code is meant to be shared out of
    // band (a code word, not a discoverable list), so checkout validates
    // one specific code through the dedicated public endpoint
    // (endpoints/promoCodeValidate.ts) instead of reading this collection
    // directly.
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'code',
    defaultColumns: ['code', 'discountType', 'discountValue', 'minOrderAmount', 'active', 'validUntil'],
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Клиент вводит без учёта регистра — сравнение нормализуется в верхний регистр.',
      },
    },
    {
      name: 'discountType',
      type: 'select',
      required: true,
      defaultValue: 'percent',
      options: [
        { label: 'Процент', value: 'percent' },
        { label: 'Фиксированная сумма (₽)', value: 'fixed' },
      ],
      admin: {
        description: 'Процент — от итоговой суммы заказа. Фиксированная сумма — вычитается из итога, но не уводит его в минус.',
      },
    },
    {
      name: 'discountValue',
      type: 'number',
      required: true,
      min: 1,
      admin: {
        description: 'Для процента — от 1 до 100. Для фиксированной суммы — рубли.',
      },
      validate: (value: number | null | undefined, { siblingData }: { siblingData: { discountType?: string } }) => {
        if (value === null || value === undefined) return 'Обязательное поле'
        // Review finding E (fix round on claude/promo-codes): the admin
        // panel already rejects a fraction client-side (Number.isInteger),
        // but that check only guards PromoCodesPanel.tsx itself — any other
        // write path (raw REST, /cms's own default admin UI) reached this
        // hook with no such guard and could persist "10.5" percent or
        // "500.75" ₽. Checked here too, so no write path can create a
        // fractional discount.
        if (!Number.isInteger(value)) return 'Значение должно быть целым числом'
        if (siblingData?.discountType === 'percent' && (value < 1 || value > 100)) {
          return 'Для процентной скидки значение должно быть от 1 до 100'
        }
        if (value < 1) return 'Значение должно быть не меньше 1'
        return true
      },
    },
    {
      // Backlog item 5 follow-up (docs/ROADMAP-2.0.md): a fixed-amount
      // discount larger than the order used to clamp totalPrice to 0 (a
      // free rental) with no way to stop it — the owner's fix is a manual,
      // per-code minimum order sum below which the code simply doesn't
      // apply. Optional and defaulted, not required: the beforeValidate
      // hook below fills it in with discountValue when an operator leaves
      // it blank (so a 500₽-off code defaults to "applies from 500₽" —
      // roughly the threshold that stops it giving away a rental for
      // free), but an operator who types a different number — higher OR
      // lower — has that value respected, and 0 is a real, distinct value
      // meaning "no threshold," not "unset."
      name: 'minOrderAmount',
      type: 'number',
      min: 0,
      admin: {
        description:
          'Сумма заказа (₽), ниже которой скидка не применяется. Пусто при создании — подставится значение скидки выше. 0 — без ограничения (скидка действует всегда, как раньше).',
      },
      validate: (value: number | null | undefined) => {
        if (value === null || value === undefined) return true
        // Same integer discipline as discountValue's own validate — every
        // write path (Local API, REST, /cms's default admin UI), not just
        // PromoCodesPanel.tsx's own client-side check.
        if (!Number.isInteger(value)) return 'Значение должно быть целым числом'
        if (value < 0) return 'Значение не может быть отрицательным'
        return true
      },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'validUntil',
      type: 'date',
      admin: {
        description: 'Необязательно — код перестаёт действовать после этой даты.',
      },
    },
    {
      name: 'description',
      type: 'text',
      admin: {
        description: 'Внутренняя заметка (например, «Летняя акция 2026») — клиенту не показывается.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (data?.code) data.code = data.code.trim().toUpperCase()
        return data
      },
      // Default minOrderAmount to discountValue when an operator leaves it
      // blank. Runs after field-level beforeValidate has already merged
      // originalDoc data into `data` (Payload's own documented order —
      // "merge original document data into incoming data" happens before
      // collection hooks run), so on a partial update `data.minOrderAmount`
      // already reflects whatever's actually stored — null/undefined here
      // only ever means "genuinely never set" (a fresh create left blank,
      // or a pre-this-feature row), never "just wasn't part of this
      // request." Checked strictly against null/undefined, not falsiness:
      // an explicit 0 must reach the DB as 0 ("no threshold"), not be
      // silently promoted back to discountValue.
      ({ data }) => {
        if (data && (data.minOrderAmount === null || data.minOrderAmount === undefined) && typeof data.discountValue === 'number') {
          data.minOrderAmount = data.discountValue
        }
        return data
      },
    ],
  },
}
