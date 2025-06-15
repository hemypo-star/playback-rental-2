// !!! ВАЖНО !!! //
// Этот файл не должен импортироваться ни в каком frontend-коде (React-компоненты, хуки, утилиты)! Используйте только в backend, API-роутах, serverless-функциях.
// Для работы с хранилищем на фронте используйте только API-запросы к backend (например, через /api/storage/*).

if (typeof window !== "undefined") {
  // Защита: если этот файл каким-то образом импортируется на фронте, выбрасываем ошибку сразу!
  throw new Error(
    "src/services/storageService.ts был импортирован во frontend-бандле! Это приведёт к ошибкам. Не импортируйте storageService или aws-sdk в React-коде."
  );
}

import s3 from '@/integrations/s3/client';

/**
 * Генерирует публичный URL для файла из S3.
 * S3 бакеты должны быть с политикой "public-read" для отдачи статики.
 */
export const getPublicUrl = (bucketName: string, fileName: string): string | null => {
  if (!fileName) return null;

  let endpoint = '';
  if (typeof s3.config.endpoint === "string") {
    endpoint = s3.config.endpoint.replace(/\/$/, "");
    return `${endpoint}/${bucketName}/${fileName}`;
  } else if (s3.config.endpoint && typeof s3.config.endpoint === "object" && "href" in s3.config.endpoint) {
    endpoint = s3.config.endpoint.href.replace(/\/$/, "");
    return `${endpoint}/${bucketName}/${fileName}`;
  }
  return null;
};

/**
 * Получить список файлов в бакете.
 */
export const listBucketFiles = async (bucketName: string): Promise<string[]> => {
  try {
    const { Contents = [] } = await s3.listObjectsV2({ Bucket: bucketName }).promise();
    return Contents.map((obj: any) => obj.Key);
  } catch (error) {
    console.error(`Error listing files in ${bucketName}:`, error);
    return [];
  }
};

/**
 * Проверить подключение к бакету — выводит список файлов.
 */
export const testStorageConnection = async (bucketName: string): Promise<{ success: boolean; message: string }> => {
  try {
    const files = await listBucketFiles(bucketName);
    return {
      success: true,
      message: `${files.length} file(s) found in ${bucketName}.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
};

/**
 * Проверить доступность двух бакетов.
 */
export const checkStorageStatus = async (): Promise<{
  products: boolean;
  categories: boolean;
  message: string;
}> => {
  const productsTest = await testStorageConnection('products');
  const categoriesTest = await testStorageConnection('categories');
  return {
    products: productsTest.success,
    categories: categoriesTest.success,
    message: `Products: ${productsTest.message}, Categories: ${categoriesTest.message}`,
  };
};

/**
 * Сбросить разрешения хранилища — noop.
 */
export const resetStoragePermissions = async (): Promise<boolean> => {
  const status = await checkStorageStatus();
  return status.products && status.categories;
};

/**
 * Проверка наличия бакета (для S3 — бакеты должны быть созданы вручную)
 */
export const ensurePublicBucket = async (bucketName: string): Promise<boolean> => {
  const status = await testStorageConnection(bucketName);
  return status.success;
};
