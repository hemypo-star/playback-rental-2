
import s3 from '@/integrations/s3/client';

/**
 * Get a public URL for a file in your S3 bucket. 
 * S3 buckets should be "public-read" for static content delivery.
 */
export const getPublicUrl = (bucketName: string, fileName: string): string | null => {
  if (!fileName) return null;

  // Your S3 endpoint and bucket (configured in s3/client.ts)
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
 * List all files in a bucket.
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
 * Test connection to a bucket by listing contents.
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
 * Check if both products/categories buckets exist and accessible.
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
 * Reset (check) storage permissions — no-op legacy.
 */
export const resetStoragePermissions = async (): Promise<boolean> => {
  const status = await checkStorageStatus();
  return status.products && status.categories;
};

/**
 * Ensure bucket exists — for S3 we assume buckets are pre-created.
 */
export const ensurePublicBucket = async (bucketName: string): Promise<boolean> => {
  const status = await testStorageConnection(bucketName);
  return status.success;
};
