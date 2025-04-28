
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
    throw uploadError;
  }

  return fileName;
};
