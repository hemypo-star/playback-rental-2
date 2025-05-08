
import { supabase } from '@/integrations/supabase/client';

export const getProductImageUrl = (imageUrl: string) => {
  if (!imageUrl) return null;
  
  // If it's already a full URL, return it
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Get public URL from storage
  const { data } = supabase.storage
    .from('products')
    .getPublicUrl(imageUrl);
    
  return data.publicUrl;
};

export const uploadProductImage = async (file: File, productId?: string): Promise<string> => {
  try {
    // Try to access the bucket first to check permissions
    const { error: bucketError } = await supabase.storage.getBucket('products');
    
    if (bucketError && bucketError.message !== 'Bucket not found') {
      console.error('Error accessing products bucket:', bucketError);
      throw new Error('Нет доступа к хранилищу товаров. Проверьте настройки авторизации.');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload options with metadata to link to product
    const uploadOptions: { upsert: boolean; metadata?: { product_id: string } } = { 
      upsert: true 
    };
    
    // Add metadata if productId is provided
    if (productId) {
      uploadOptions.metadata = { 
        product_id: productId 
      };
    }

    const { error: uploadError, data } = await supabase.storage
      .from('products')
      .upload(fileName, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading product image:', uploadError);
      throw uploadError;
    }

    // Get and return the public URL
    const { data: publicUrlData } = supabase.storage
      .from('products')
      .getPublicUrl(fileName);
      
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};

export const uploadCategoryImage = async (file: File, categoryId?: string): Promise<string> => {
  try {
    // Try to access the bucket first to check permissions
    const { error: bucketError } = await supabase.storage.getBucket('categories');
    
    if (bucketError && bucketError.message !== 'Bucket not found') {
      console.error('Error accessing categories bucket:', bucketError);
      throw new Error('Нет доступа к хранилищу категорий. Проверьте настройки авторизации.');
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

    // Upload options with metadata to link to category
    const uploadOptions: { upsert: boolean; metadata?: { category_id: string } } = { 
      upsert: true 
    };
    
    // Add metadata if categoryId is provided
    if (categoryId) {
      uploadOptions.metadata = { 
        category_id: categoryId 
      };
    }

    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('categories')
      .upload(fileName, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading category image:', uploadError);
      throw uploadError;
    }

    // Get and return the public URL
    const { data: publicUrlData } = supabase.storage
      .from('categories')
      .getPublicUrl(fileName);
      
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};
