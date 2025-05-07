
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
  // Create the bucket if it doesn't exist (though we've already done this in SQL)
  try {
    await supabase.storage.getBucket('products');
  } catch (error) {
    console.log('Creating products bucket');
    await supabase.storage.createBucket('products', { public: true });
  }
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

  // Upload options with optional metadata
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
};

export const uploadCategoryImage = async (file: File): Promise<string> => {
  // Create the bucket if it doesn't exist (though we've already done this in SQL)
  try {
    await supabase.storage.getBucket('categories');
  } catch (error) {
    console.log('Creating categories bucket');
    await supabase.storage.createBucket('categories', { public: true });
  }
  
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

  // Upload the file
  const { error: uploadError } = await supabase.storage
    .from('categories')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    console.error('Error uploading category image:', uploadError);
    throw uploadError;
  }

  // Get and return the public URL
  const { data: publicUrlData } = supabase.storage
    .from('categories')
    .getPublicUrl(fileName);
    
  return publicUrlData.publicUrl;
};
