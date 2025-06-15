
/**
 * Utilities for working with product/category images in S3.
 * All upload logic is now handled via backend API (not using aws-sdk in frontend).
 */

const BASE_PRODUCTS_BUCKET = "products";
const BASE_CATEGORIES_BUCKET = "categories";

/**
 * Получить базовый URL для S3 public static files.
 */
function getS3BaseUrl(bucket: string): string {
  // Prefer Vercel env for endpoint if available, else fallback to Yandex/AWS standard
  const endpoint = import.meta.env.VITE_S3_PUBLIC_ENDPOINT || "https://s3.amazonaws.com";
  return `${endpoint.replace(/\/$/, "")}/${bucket}`;
}

/**
 * Загрузка картинки товара в S3 через API (возвращает публичный URL).
 */
export async function uploadProductImage(
  imageFile: File | string,
  productId?: string
): Promise<string> {
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('http')) return imageFile;
    return imageFile;
  }

  // 1. Запрашиваем presigned url у API
  const resp = await fetch('/api/upload/product-image', {
    method: 'POST',
    headers: {},
    body: await createUploadFormData(imageFile, productId),
  });

  if (!resp.ok) {
    throw new Error('Не удалось получить presigned URL для S3');
  }
  const { fileUrl } = await resp.json();
  return fileUrl;
}

/**
 * URL картинки продукта из S3.
 */
export const getProductImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${getS3BaseUrl(BASE_PRODUCTS_BUCKET)}/${imageUrl}`;
};

/**
 * Загрузка картинки категории в S3 через API (возвращает публичный URL).
 */
export async function uploadCategoryImage(
  imageFile: File | string,
  categoryId?: string
): Promise<string> {
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('http')) return imageFile;
    return imageFile;
  }

  const resp = await fetch('/api/upload/category-image', {
    method: 'POST',
    headers: {},
    body: await createUploadFormData(imageFile, categoryId),
  });

  if (!resp.ok) {
    throw new Error('Не удалось получить presigned URL для S3');
  }
  const { fileUrl } = await resp.json();
  return fileUrl;
}

/**
 * URL картинки категории.
 */
export const getCategoryImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  if (imageUrl.startsWith('http')) return imageUrl;
  return `${getS3BaseUrl(BASE_CATEGORIES_BUCKET)}/${imageUrl}`;
};

// Helper: create a FormData for upload API
async function createUploadFormData(file: File, id?: string) {
  const form = new FormData();
  form.append('file', file);
  if (id) form.append('id', id);
  return form;
}

