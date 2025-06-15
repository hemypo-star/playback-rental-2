import s3 from "@/integrations/s3/client";

/**
 * Uploads an image to S3
 */
export const uploadProductImage = async (imageFile: File | string, productId?: string): Promise<string> => {
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('http')) return imageFile;
    return imageFile;
  }
  // Convert the browser File to Blob, then to Buffer (for Node), then upload to S3
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
  // Construct the URL
  const s3Url = `https://${bucket}.${s3.config.endpoint.host}/${fileName}`;
  return s3Url;
};

/**
 * Gets the URL of a product image (assume already public in S3)
 */
export const getProductImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  if (imageUrl.startsWith('http')) return imageUrl;
  // Otherwise, assume S3 style path
  const bucket = "YOUR_S3_BUCKET_NAME";
  return `https://${bucket}.${s3.config.endpoint.host}/${imageUrl}`;
};

/**
 * Uploads a category image to Supabase storage
 * @param imageFile The image file to upload
 * @param categoryId Optional category ID for updates
 * @returns The URL of the uploaded image
 */
export const uploadCategoryImage = async (imageFile: File | string, categoryId?: string): Promise<string> => {
  // If imageFile is already a URL (string), just return it
  if (typeof imageFile === 'string') {
    return imageFile;
  }
  
  const timestamp = new Date().getTime();
  const fileName = `${categoryId ? `${categoryId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const filePath = `${fileName}`;
  
  try {
    console.log('Uploading category image to bucket "categories":', filePath);
    
    const { error: uploadError } = await supabase.storage
      .from('categories')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Error uploading category image:', uploadError);
      throw new Error(`Error uploading category image: ${uploadError.message}`);
    }
    
    console.log('Category image uploaded successfully:', filePath);
    // Return the path of the uploaded image
    return filePath;
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};

/**
 * Gets the URL of a category image
 * @param imageUrl The image URL or path
 * @returns The full URL of the image
 */
export const getCategoryImageUrl = (imageUrl: string): string => {
  if (!imageUrl) return '/placeholder.svg';
  
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  return `https://xwylatyyhqyfwsxfwzmn.supabase.co/storage/v1/object/public/categories/${imageUrl}`;
};

/**
 * Verifies storage access by attempting to list files
 * @returns Boolean indicating if storage is accessible
 */
export const verifyStorageAccess = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage.getBucket('products');
    if (error) {
      console.error('Error accessing storage:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in verifyStorageAccess:', error);
    return false;
  }
};
