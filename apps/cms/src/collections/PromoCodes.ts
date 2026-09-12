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
    defaultColumns: ['code', 'discountType', 'discountValue', 'active', 'validUntil'],
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
        if (siblingData?.discountType === 'percent' && (value < 1 || value > 100)) {
          return 'Для процентной скидки значение должно быть от 1 до 100'
        }
        if (value < 1) return 'Значение должно быть не меньше 1'
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
    ],
  },
}
