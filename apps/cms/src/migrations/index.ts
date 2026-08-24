import * as migration_20260814_042950_initial_schema from './20260814_042950_initial_schema';
import * as migration_20260824_055731_categories_promotions_schema_drift from './20260824_055731_categories_promotions_schema_drift';
import * as migration_20260824_062705_products_orders_indexes from './20260824_062705_products_orders_indexes';

export const migrations = [
  {
    up: migration_20260814_042950_initial_schema.up,
    down: migration_20260814_042950_initial_schema.down,
    name: '20260814_042950_initial_schema',
  },
  {
    up: migration_20260824_055731_categories_promotions_schema_drift.up,
    down: migration_20260824_055731_categories_promotions_schema_drift.down,
    name: '20260824_055731_categories_promotions_schema_drift',
  },
  {
    up: migration_20260824_062705_products_orders_indexes.up,
    down: migration_20260824_062705_products_orders_indexes.down,
    name: '20260824_062705_products_orders_indexes',
  },
];
