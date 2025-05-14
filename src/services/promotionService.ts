
import { supabase } from '@/integrations/supabase/client';
import { Promotion, PromotionFormValues } from '@/types/promotion';
import { uploadProductImage } from '@/utils/imageUtils';

// Function to convert DB row to our Promotion interface
const mapDbRowToPromotion = (row: any): Promotion => ({
  id: row.id,
  title: row.title,
  imageurl: row.imageurl,
  linkurl: row.linkurl,
  order: row.order,
  active: row.active,
  created_at: row.created_at,
});

// Get all promotions, ordered by the 'order' field
export const getPromotions = async (): Promise<Promotion[]> => {
  try {
    console.log('Fetching promotions...');
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('order', { ascending: true });
    
    if (error) {
      console.error('Error fetching promotions:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} promotions`);
    return data?.map(mapDbRowToPromotion) || [];
  } catch (error) {
    console.error('Error in getPromotions:', error);
    throw error;
  }
};

// Get only active promotions for display on the frontend
export const getActivePromotions = async (): Promise<Promotion[]> => {
  try {
    console.log('Fetching active promotions...');
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('active', true)
      .order('order', { ascending: true });
    
    if (error) {
      console.error('Error fetching active promotions:', error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} active promotions`);
    return data?.map(mapDbRowToPromotion) || [];
  } catch (error) {
    console.error('Error in getActivePromotions:', error);
    throw error;
  }
};

// Create a new promotion
export const createPromotion = async (promotionData: PromotionFormValues): Promise<Promotion> => {
  try {
    console.log('Creating new promotion:', promotionData);
    
    let imageUrl = promotionData.imageUrl || '';
    
    // Handle image upload if provided
    if (promotionData.imageFile) {
      console.log('Uploading promotion image...');
      try {
        imageUrl = await uploadProductImage(promotionData.imageFile);
        console.log('Image uploaded successfully:', imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (!imageUrl) {
      throw new Error('No image provided for promotion');
    }
    
    // Get the highest current order value to place the new promotion at the end
    const { data: maxOrderData } = await supabase
      .from('promotions')
      .select('order')
      .order('order', { ascending: false })
      .limit(1);
    
    const newOrder = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].order + 1) : 0;
    
    console.log('Inserting promotion with image URL:', imageUrl);
    
    // Insert new promotion with database column names
    const { data, error } = await supabase
      .from('promotions')
      .insert([{
        title: promotionData.title,
        imageurl: imageUrl,
        linkurl: promotionData.linkUrl,
        active: promotionData.active,
        order: newOrder
      }])
      .select('*')
      .single();
    
    if (error) {
      console.error('Error creating promotion:', error);
      throw error;
    }
    
    console.log('Promotion created successfully:', data);
    return mapDbRowToPromotion(data);
  } catch (error) {
    console.error('Error in createPromotion:', error);
    throw error;
  }
};

// Update an existing promotion
export const updatePromotion = async (id: string, promotionData: PromotionFormValues): Promise<Promotion> => {
  try {
    console.log(`Updating promotion ${id}:`, promotionData);
    
    let imageUrl = promotionData.imageUrl || '';
    
    // Handle image upload if provided
    if (promotionData.imageFile) {
      console.log('Uploading new promotion image...');
      try {
        imageUrl = await uploadProductImage(promotionData.imageFile);
        console.log('New image uploaded successfully:', imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else if (!imageUrl) {
      // If we're updating and no new image is provided, we need to get the existing one
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
    
    console.log('Updating promotion with image URL:', imageUrl);
    
    const { data, error } = await supabase
      .from('promotions')
      .update({
        title: promotionData.title,
        imageurl: imageUrl,
        linkurl: promotionData.linkUrl,
        active: promotionData.active
      })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      console.error(`Error updating promotion ${id}:`, error);
      throw error;
    }
    
    console.log(`Promotion ${id} updated successfully:`, data);
    return mapDbRowToPromotion(data);
  } catch (error) {
    console.error(`Error in updatePromotion for ID ${id}:`, error);
    throw error;
  }
};

// Delete a promotion
export const deletePromotion = async (id: string): Promise<void> => {
  try {
    console.log(`Deleting promotion ${id}...`);
    
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting promotion ${id}:`, error);
      throw error;
    }
    
    console.log(`Promotion ${id} deleted successfully`);
  } catch (error) {
    console.error(`Error in deletePromotion for ID ${id}:`, error);
    throw error;
  }
};

// Update the order of promotions
export const reorderPromotions = async (promotionIds: string[]): Promise<void> => {
  try {
    console.log('Reordering promotions:', promotionIds);
    
    // Start a transaction to update all orders
    for (let i = 0; i < promotionIds.length; i++) {
      const { error } = await supabase
        .from('promotions')
        .update({ order: i })
        .eq('id', promotionIds[i]);
      
      if (error) {
        console.error(`Error updating order for promotion ${promotionIds[i]}:`, error);
        throw error;
      }
    }
    
    console.log('Promotions reordered successfully');
  } catch (error) {
    console.error('Error in reorderPromotions:', error);
    throw error;
  }
};
