

import s3 from "@/integrations/s3/client";

/**
 * Получить базовый URL S3 из endpoint.
 */
function getS3BaseUrl(bucket: string): string {
  let endpointUrl: string | undefined;

  if (typeof s3.config.endpoint === "string") {
    endpointUrl = s3.config.endpoint.replace(/\/$/, "");
  } else if (s3.config.endpoint && typeof s3.config.endpoint === "object" && "href" in s3.config.endpoint) {
    endpointUrl = (s3.config.endpoint as { href?: string }).href;
    if (endpointUrl) endpointUrl = endpointUrl.replace(/\/$/, "");
  } else {
    endpointUrl = "https://s3.amazonaws.com";
  }
  if (endpointUrl) {
    if (endpointUrl.startsWith("https://")) {
      return `${endpointUrl}/${bucket}`;
    } else {
      return `https://${bucket}.${endpointUrl}`;
    }
  }
  return "";
}

/**
 * Загрузка картинки товара в S3.
 */
export const uploadProductImage = async (imageFile: File | string, productId?: string): Promise<string> => {
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('http')) return imageFile;
    return imageFile;
  }
  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const timestamp = Date.now();
  const fileName = `${productId ? `${productId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const bucket = "products";  // ВАЖНО: настройте здесь имя бакета для товаров

  const uploadParams = {
    Bucket: bucket,
    Key: fileName,
    Body: buffer,
    ContentType: imageFile.type,
    ACL: "public-read"
  };

  await s3.upload(uploadParams).promise();

  return `${getS3BaseUrl(bucket)}/${fileName}`;
};

/**
 * URL картинки продукта из S3.
 */
export const getProductImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  if (imageUrl.startsWith('http')) return imageUrl;
  const bucket = "products";
  return `${getS3BaseUrl(bucket)}/${imageUrl}`;
};

/**
 * Загрузка картинки категории в S3 (папка categories внутри бакета)
 */
export const uploadCategoryImage = async (imageFile: File | string, categoryId?: string): Promise<string> => {
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('http')) return imageFile;
    return imageFile;
  }
  const timestamp = Date.now();
  const fileName = `category_${categoryId ? `${categoryId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const bucket = "categories"; // ВАЖНО: настройте имя бакета для категорий

  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadParams = {
    Bucket: bucket,
    Key: fileName,
    Body: buffer,
    ContentType: imageFile.type,
    ACL: "public-read"
  };

  await s3.upload(uploadParams).promise();
  return `${getS3BaseUrl(bucket)}/${fileName}`;
};

/**
 * URL картинки категории.
 */
export const getCategoryImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  if (imageUrl.startsWith('http')) return imageUrl;
  const bucket = "categories";
  return `${getS3BaseUrl(bucket)}/${imageUrl}`;
};
