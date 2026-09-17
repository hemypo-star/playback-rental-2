import * as migration_20260814_042950_initial_schema from './20260814_042950_initial_schema';
import * as migration_20260824_055731_categories_promotions_schema_drift from './20260824_055731_categories_promotions_schema_drift';
import * as migration_20260824_062705_products_orders_indexes from './20260824_062705_products_orders_indexes';
import * as migration_20260910_120000_rate_limit_hits from './20260910_120000_rate_limit_hits';
import * as migration_20260910_130000_rate_limit_hits_prune_idx from './20260910_130000_rate_limit_hits_prune_idx';
import * as migration_20260911_090000_rate_limit_hits_uuid_pk from './20260911_090000_rate_limit_hits_uuid_pk';
import * as migration_20260911_140000_site_settings_business_hours from './20260911_140000_site_settings_business_hours';
import * as migration_20260912_090000_add_promo_codes from './20260912_090000_add_promo_codes';
import * as migration_20260918_010000_media_card_large_sizes from './20260918_010000_media_card_large_sizes';

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
  {
    up: migration_20260910_120000_rate_limit_hits.up,
    down: migration_20260910_120000_rate_limit_hits.down,
    name: '20260910_120000_rate_limit_hits',
  },
  {
    up: migration_20260910_130000_rate_limit_hits_prune_idx.up,
    down: migration_20260910_130000_rate_limit_hits_prune_idx.down,
    name: '20260910_130000_rate_limit_hits_prune_idx',
  },
  {
    up: migration_20260911_090000_rate_limit_hits_uuid_pk.up,
    down: migration_20260911_090000_rate_limit_hits_uuid_pk.down,
    name: '20260911_090000_rate_limit_hits_uuid_pk',
  },
  {
    up: migration_20260911_140000_site_settings_business_hours.up,
    down: migration_20260911_140000_site_settings_business_hours.down,
    name: '20260911_140000_site_settings_business_hours',
  },
  {
    up: migration_20260912_090000_add_promo_codes.up,
    down: migration_20260912_090000_add_promo_codes.down,
    name: '20260912_090000_add_promo_codes',
  },
  {
    up: migration_20260918_010000_media_card_large_sizes.up,
    down: migration_20260918_010000_media_card_large_sizes.down,
    name: '20260918_010000_media_card_large_sizes',
  },
];
