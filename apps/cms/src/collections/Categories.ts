import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'moySkladFolderId', 'order'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier, e.g. "kamery" for /catalog/kamery',
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      // Short badge on the homepage category tile (e.g. "35мм", "SONY") —
      // admin-editable, not derived from МойСклад.
      name: 'tag',
      type: 'text',
      admin: {
        description: 'Short badge shown on the homepage category tile (e.g. "35мм", "SONY"). Not synced.',
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Sort order in the catalog sidebar.',
      },
    },
    // Admin-organized hierarchy — deliberately never touched by the МойСклад
    // sync (same treatment as tag/image/order/description above), even
    // though a sensible default is technically derivable from the folder
    // tree's pathName: the sync's own established pattern is "never touch
    // an organizational field past initial creation," and letting admin
    // freely restructure this (МойСклад's raw folder tree isn't always the
    // grouping that makes sense on the storefront) without a resync ever
    // fighting them back is more valuable here than free auto-population.
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      admin: {
        description: 'Родительская категория. Пусто — категория верхнего уровня.',
      },
      // A category can't be its own parent — the deeper cycle case (picking
      // a descendant as parent) is guarded in the admin UI instead, where a
      // full descendant set can actually be computed against live sibling
      // data; this field-level check is just the cheap, always-true case.
      validate: (value: unknown, { id }: { id?: number | string }) => {
        if (value != null && String(value) === String(id)) {
          return 'Категория не может быть родителем самой себя'
        }
        return true
      },
    },
    // Sync bookkeeping: this category mirrors a productfolder under the
    // "PlayBack Rental" subtree in МойСклад (see the Phase 0 folder audit
    // in the project plan — the account is shared with unrelated businesses,
    // so only that subtree syncs). Null for categories created manually in Payload.
    {
      name: 'moySkladFolderId',
      type: 'text',
      unique: true,
      admin: {
        readOnly: true,
        description: 'МойСклад productfolder id, set only for synced categories.',
      },
    },
  ],
}
