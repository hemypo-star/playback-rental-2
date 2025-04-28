
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

export const uploadProductImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { error: uploadError, data } = await supabase.storage
    .from('products')
    .upload(fileName, file);

  if (uploadError) {
    throw uploadError;
  }

  return fileName;
};
