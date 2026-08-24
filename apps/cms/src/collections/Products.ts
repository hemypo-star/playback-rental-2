import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
        description: 'RUB. For rental listings this is the per-day rate; for sale listings, the one-time price. Synced from МойСклад salePrice (stored there in kopecks; divided by 100 on import).',
      },
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
    },
    {
      name: 'quantity',
      type: 'number',
      required: true,
      min: 0,
      defaultValue: 0,
      admin: {
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
        description: 'Marks this product as a bundled kit ("Наборы" on the storefront) rather than a single item. Not synced.',
      },
    },
    {
      name: 'oldPrice',
      type: 'number',
      min: 0,
      admin: {
        description: 'Combined price of the items if rented separately — shown struck through next to the kit price. Kits only. Not synced.',
        condition: (data) => Boolean(data?.isKit),
      },
    },
    {
      name: 'kitItems',
      type: 'array',
      admin: {
        description: 'What\'s included, shown as a numbered list ("Что в комплекте"). Kits only. Not synced.',
        condition: (data) => Boolean(data?.isKit),
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
        },
      ],
    },
    // Sync bookkeeping. For listingType 'rental', moySkladId points at a
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
  ],
}
