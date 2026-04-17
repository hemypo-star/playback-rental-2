import { supabase } from '@/integrations/supabase/client';
import { Promotion, PromotionFormValues } from '@/types/promotion';
import { uploadProductImage } from '@/utils/imageUtils';
import { slugify } from '@/utils/slugify';

const mapDbRowToPromotion = (row: any): Promotion => ({
  id: row.id,
  title: row.title,
  imageurl: row.imageurl,
  linkurl: row.linkurl,
  order: row.order,
  active: row.active,
  created_at: row.created_at,
  slug: row.slug,
  content: row.content,
});

export const getPromotions = async (): Promise<Promotion[]> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('order', { ascending: true });
    
    if (error) throw error;
    return data?.map(mapDbRowToPromotion) || [];
  } catch (error) {
    console.error('Error in getPromotions:', error);
    throw error;
  }
};

export const getActivePromotions = async (): Promise<Promotion[]> => {
  try {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('active', true)
      .order('order', { ascending: true });
    
    if (error) throw error;
    return data?.map(mapDbRowToPromotion) || [];
  } catch (error) {
    console.error('Error in getActivePromotions:', error);
    throw error;
  }
};

export const createPromotion = async (promotionData: PromotionFormValues): Promise<Promotion> => {
  try {
    let imageUrl = promotionData.imageUrl || '';
    
    if (promotionData.imageFile) {
      try {
        imageUrl = await uploadProductImage(promotionData.imageFile);
      } catch (error) {
        throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (!imageUrl) {
      throw new Error('No image provided for promotion');
    }
    
    const { data: maxOrderData } = await supabase
      .from('promotions')
      .select('order')
      .order('order', { ascending: false })
      .limit(1);
    
    const newOrder = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].order + 1) : 0;
    const generatedSlug = promotionData.title ? slugify(promotionData.title) : undefined;
    
    const { data, error } = await supabase
      .from('promotions')
      .insert([{
        title: promotionData.title,
        imageurl: imageUrl,
        linkurl: promotionData.linkUrl || '',
        active: promotionData.active,
        order: newOrder,
        slug: generatedSlug,
        content: promotionData.content || ''
      }])
      .select('*')
      .single();
    
    if (error) {
      if (error.code === '23505' && error.message.includes('promotions_slug_key')) {
         throw new Error('Акция с таким названием уже существует. Пожалуйста, измените заголовок.');
      }
      throw error;
    }
    
    return mapDbRowToPromotion(data);
  } catch (error) {
    console.error('Error in createPromotion:', error);
    throw error;
  }
};

export const updatePromotion = async (id: string, promotionData: PromotionFormValues): Promise<Promotion> => {
  try {
    let imageUrl = promotionData.imageUrl || '';
    
    if (promotionData.imageFile) {
      try {
        imageUrl = await uploadProductImage(promotionData.imageFile);
      } catch (error) {
        throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (!imageUrl) {
      const { data: existingPromotion } = await supabase
        .from('promotions')
        .select('imageurl')
        .eq('id', id)
        .single();
        
      if (existingPromotion) {
        imageUrl = existingPromotion.imageurl;
      } else {
        throw new Error('No image provided for promotion update');
      }
    }
    
    const generatedSlug = promotionData.title ? slugify(promotionData.title) : undefined;
    
    const { data, error } = await supabase
      .from('promotions')
      .update({
        title: promotionData.title,
        imageurl: imageUrl,
        linkurl: promotionData.linkUrl || '',
        active: promotionData.active,
        slug: generatedSlug,
        content: promotionData.content || ''
      })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      if (error.code === '23505' && error.message.includes('promotions_slug_key')) {
         throw new Error('Акция с таким названием уже существует. Пожалуйста, измените заголовок.');
      }
      throw error;
    }
    
    return mapDbRowToPromotion(data);
  } catch (error) {
    console.error(`Error in updatePromotion for ID ${id}:`, error);
    throw error;
  }
};

export const deletePromotion = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error in deletePromotion for ID ${id}:`, error);
    throw error;
  }
};

export const reorderPromotions = async (promotionIds: string[]): Promise<void> => {
  try {
    for (let i = 0; i < promotionIds.length; i++) {
      const { error } = await supabase
        .from('promotions')
        .update({ order: i })
        .eq('id', promotionIds[i]);
      
      if (error) throw error;
    }
  } catch (error) {
    console.error('Error in reorderPromotions:', error);
    throw error;
  }
};