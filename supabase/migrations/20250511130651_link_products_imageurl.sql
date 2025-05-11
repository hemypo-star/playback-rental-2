-- Привязка products.imageurl к бакету products
SELECT storage_api.create_file_table(
  'public',   -- схема
  'products', -- таблица
  'imageurl', -- колонка
  'products'  -- бакет
);
