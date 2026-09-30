import type { CollectionConfig, Where } from 'payload'

// Payload's relationship validation rejects raw ids that arrive as JSON
// *numbers* ("The following field is invalid: Compatible Accessories") — it
// only accepts them as strings (what the admin UI itself sends) or populated
// docs. The kit/product admin panels post plain number[] over Server Actions,
// so normalize before validation on every write path.
function toRelationId(v: unknown): string | number | null | undefined {
  return typeof v === 'number' ? String(v) : (v as string | number | null | undefined)
}

function normalizeCompatibleAccessories(data: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(data.compatibleAccessories)) {
    data.compatibleAccessories = data.compatibleAccessories.map(toRelationId)
  }
  return data
}

export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeChange: [
      ({ data }) => normalizeCompatibleAccessories(data as Record<string, unknown>),
    ],
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'quantity', 'price', 'stockStatus'],
  },
  fields: [
    {
      // Computed, not stored — matches the delivered design's Stock badge
      // ("В наличии" / "Мало" / "Нет в наличии") over the real Products list
      // so search/sort/filter/pagination stay intact instead of being
      // reimplemented in a bespoke static view.
      name: 'stockStatus',
      type: 'ui',
      label: 'Статус',
      admin: {
        components: {
          Cell: '/src/components/admin/StockStatusCell#StockStatusCell',
        },
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Название на витрине. Правки из админки сохраняются: синхронизация обновляет это поле из МойСклада только пока оно не менялось локально (сравнение с lastSyncedMsValues). Кнопка «Синхронизировать» принудительно подтягивает его из МойСклада.',
      },
    },
    {
      // МойСклад has two parallel, non-overlapping subtrees under
      // "PlayBack Rental": "Аренда оборудования" (date-range rental) and
      // "На продажу" (one-time sale) — a third, "Оборудование (для учета)",
      // mirrors the rental categories for internal asset tracking and is
      // never synced. The sync job sets this from which subtree a product
      // came from; the storefront/checkout branch on it (date-range booking
      // vs. simple purchase — sale UX still to be designed).
      name: 'listingType',
      type: 'select',
      required: true,
      options: [
        { label: 'Rental (по датам)', value: 'rental' },
        { label: 'Sale (на продажу)', value: 'sale' },
      ],
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Описание на витрине. Правки из админки сохраняются (см. title): sync обновляет его из МойСклада, только пока оно не менялось локально.',
      },
    },
    {
      // Short spec line shown under the title on cards/product page (e.g.
      // "Полный кадр · 4K 120p") — МойСклад has nothing structured enough to
      // derive this from, so it's admin-editable with no sync involvement.
      name: 'subtitle',
      type: 'text',
      admin: {
        description: 'Short spec line shown under the title on cards and the product page (e.g. "Полный кадр · 4K 120p"). Not synced.',
      },
    },
    {
      // Short chip label on the catalog card image (e.g. "Камера", "Набор") —
      // falls back to the category name in the UI when unset.
      name: 'tag',
      type: 'text',
      admin: {
        description: 'Short badge shown on the card image (e.g. "Камера", "Набор"). Falls back to the category name when unset. Not synced.',
      },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        readOnly: true,
        description: 'RUB. For rental listings this is the per-day rate; for sale listings, the one-time price. Synced from МойСклад salePrice (stored there in kopecks; divided by 100 on import).',
      },
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      admin: {
        description: 'Фотографии витрины. Заполняются один раз при импорте товара из МойСклада; последующие синхронизации галерею не трогают — редактируйте свободно.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      admin: {
        readOnly: true,
        description: 'Total units owned, synced from МойСклад stock. NOT the same as availability for a given rental date range — that\'s computed from overlapping bookings (see the bookings collection).',
      },
    },
    {
      name: 'available',
      type: 'checkbox',
      defaultValue: true,
      // Every catalog listing query filters on this (lib/data/products.ts's
      // getProducts()) — confirmed absent, flagged as PERF-004 in
      // docs/audits/2026-08-24-baseline.md.
      index: true,
      admin: {
        description: 'Manual override to hide/pause a product for rental regardless of МойСклад stock (e.g. under repair). Not synced.',
      },
    },
    // Kits ("Наборы") — a bundle is just a product (own moySkladId, price,
    // quantity, availability — priced and booked exactly like any other
    // rental listing) with these extra admin-editable fields describing
    // what's inside it and the discount story. Never synced.
    {
      name: 'isKit',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        readOnly: true,
        description: 'Marks this product as a bundled kit ("Наборы" on the storefront) rather than a single item. Not synced.',
      },
    },
    {
      name: 'oldPrice',
      type: 'number',
      min: 0,
      admin: {
        readOnly: true,
        description: 'Combined price of the items if rented separately — shown struck through next to the kit price. Kits only. Not synced.',
        condition: (data) => Boolean(data?.isKit),
      },
    },
    {
      name: 'kitItems',
      type: 'array',
      admin: {
        readOnly: true,
        description: 'What\'s included, shown as a numbered list ("Что в комплекте"). Kits only. Not synced.',
        condition: (data) => Boolean(data?.isKit),
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
        {
          // The component product's id — label alone made the kit editor's
          // composition unreadable (it round-tripped array-row ids instead),
          // and the storefront needs it to render component cards. Kept as
          // plain text (not a relationship) on purpose: a kit must keep
          // showing its composition even if a component is later deleted in
          // МойСклад. Not synced.
          name: 'productId',
          type: 'number',
          admin: {
            readOnly: true,
            disableListColumn: true,
          },
        },
      ],
    },
    // Sync bookkeeping — SYSTEM fields, intentionally read-only in the admin
    // UI (moySkladId is the sync matching key; changing it orphans the product
    // from its МойСклад entity). NOTE: Payload's `readOnly` is a pure admin-UI
    // flag — REST Local API / payload.update(overrideAccess) still accept these
    // values, so the sync job is unaffected. For listingType 'rental',
    // moySkladId points at a
    // МойСклад *service* entity (Аренда оборудования — rentals are modeled
    // as services there, since ownership never transfers). For 'sale', it
    // points at a *product* entity (На продажу). The two entity types are
    // fetched from different МойСклад API endpoints — see the sync module.
    {
      name: 'moySkladId',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        readOnly: true,
      },
    },
    {
      // Rental services carry no stock themselves (services aren't
      // inventory-tracked in МойСклад). Quantity for a rental listing is
      // sourced from the correspondingly-named product in the parallel
      // "Оборудование (для учета)" tree, matched case-insensitively by
      // stripping the "Аренда " name prefix (validated ~98% match rate in
      // Phase 1). Null for sale listings, which carry their own stock directly.
      name: 'moySkladInventoryProductId',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'For rental listings: the matched "для учета" product id that supplied the quantity/image.',
      },
    },
    {
      name: 'moySkladCode',
      type: 'text',
      admin: {
        readOnly: true,
        description: 'МойСклад product code/externalCode, for cross-referencing in their UI.',
      },
    },
    {
      name: 'lastSyncedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    // Curated in the admin panel (product page → "Совместимые аксессуары");
    // never synced. Rendered on the storefront product page as a
    // "Подойдёт к этому товару" block. relationTo: 'products' makes Payload
    // create a join table products_compatible_accessories — see migration
    // 20260929_120000_products_compatible_accessories.
    {
      name: 'compatibleAccessories',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      filterOptions: ({ id }) => ({
        // A product can't be its own accessory; kits reference their
        // components via kitItems, so the accessories list stays plain items.
        and: [
          { id: { not_equals: id ?? 0 } },
          { isKit: { not_equals: true } },
        ] as Where[],
      }),
      admin: {
        description: 'Аксессуары и оснастка, которые подходят к этому товару (напр. стедикам к камере). Показываются на витрине блоком «Подойдёт к этому товару». Не синхронизируется.',
      },
    },
    {
      // Sync bookkeeping — the values title/description/category/images had
      // at the last sync run, as imported from МойСклад. The bulk/single
      // sync compares current stored values against this snapshot to decide
      // whether a field was edited in the admin panel since the previous
      // run (edited -> left alone; unchanged -> refreshed from МойСклад).
      // Never written by hand; hidden from the UI entirely.
      name: 'lastSyncedMsValues',
      type: 'json',
      admin: {
        readOnly: true,
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
    },
  ],
}
