
import s3 from "@/integrations/s3/client";

/**
 * Helper to get the S3 base URL from the custom endpoint input.
 */
function getS3BaseUrl(bucket: string): string {
  // s3.config.endpoint may be a string or AWS Endpoint object.
  // Prefer .href (URL) for flexibility.
  let endpointUrl: string | undefined;

  if (typeof s3.config.endpoint === "string") {
    // Remove trailing slash if present
    endpointUrl = s3.config.endpoint.replace(/\/$/, "");
  } else if (s3.config.endpoint && typeof s3.config.endpoint === "object" && "href" in s3.config.endpoint) {
    endpointUrl = (s3.config.endpoint as { href?: string }).href;
    if (endpointUrl) endpointUrl = endpointUrl.replace(/\/$/, "");
  } else {
    // fallback: default AWS S3
    endpointUrl = "https://s3.amazonaws.com";
  }

  // https://bucket.endpoint-domain.com (virtual hosted-style)
  if (endpointUrl) {
    if (endpointUrl.startsWith("https://")) {
      // Most S3 providers support both styles; we choose "bucket.endpoint/path"
      return `${endpointUrl}/${bucket}`;
    } else {
      return `https://${bucket}.${endpointUrl}`;
    }
  }

  // fallback
  return "";
}

/**
 * Uploads an image to S3
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
  const bucket = "YOUR_S3_BUCKET_NAME"; // Set your bucket name

  const uploadParams = {
    Bucket: bucket,
    Key: fileName,
    Body: buffer,
    ContentType: imageFile.type,
    ACL: "public-read"
  };

  await s3.upload(uploadParams).promise();

  // Return the public URL
  return `${getS3BaseUrl(bucket)}/${fileName}`;
};

/**
 * Gets the URL of a product image (assume already public in S3)
 */
export const getProductImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  if (imageUrl.startsWith('http')) return imageUrl;
  const bucket = "YOUR_S3_BUCKET_NAME";
  return `${getS3BaseUrl(bucket)}/${imageUrl}`;
};

/**
 * Uploads a category image to S3 storage (now migrated from Supabase)
 * @param imageFile The image file to upload
 * @param categoryId Optional category ID for updates
 * @returns The URL of the uploaded image
 */
export const uploadCategoryImage = async (imageFile: File | string, categoryId?: string): Promise<string> => {
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('http')) return imageFile;
    return imageFile;
  }

  const timestamp = Date.now();
  const fileName = `category_${categoryId ? `${categoryId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const bucket = "YOUR_S3_BUCKET_NAME"; // Set your bucket name for categories

  const arrayBuffer = await imageFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadParams = {
    Bucket: bucket,
    Key: `categories/${fileName}`,
    Body: buffer,
    ContentType: imageFile.type,
    ACL: "public-read"
  };

  await s3.upload(uploadParams).promise();
  return `${getS3BaseUrl(bucket)}/categories/${fileName}`;
};

/**
 * Gets the URL of a category image (now from S3, not Supabase)
 * @param imageUrl The image URL or path
 * @returns The full URL of the image
 */
export const getCategoryImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  if (imageUrl.startsWith('http')) return imageUrl;
  // All images now stored in "categories" folder in S3 bucket
  const bucket = "YOUR_S3_BUCKET_NAME";
  if (imageUrl.startsWith("categories/")) {
    return `${getS3BaseUrl(bucket)}/${imageUrl}`;
  }
  return `${getS3BaseUrl(bucket)}/categories/${imageUrl}`;
};

