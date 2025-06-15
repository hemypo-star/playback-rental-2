
import { Promotion, PromotionFormValues } from '@/types/promotion';
import { uploadProductImage } from '@/utils/imageUtils';

const API_URL = '/api/promotions';

const mapDbRowToPromotion = (row: any): Promotion => ({
  id: row.id,
  title: row.title,
  imageurl: row.imageurl,
  linkurl: row.linkurl,
  order: row.order,
  active: row.active,
  created_at: row.created_at,
});

export const getPromotions = async (): Promise<Promotion[]> => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Ошибка загрузки акций');
    const data = await res.json();
    return data.map(mapDbRowToPromotion);
  } catch (error) {
    console.error('Error in getPromotions:', error);
    throw error;
  }
};

export const getActivePromotions = async (): Promise<Promotion[]> => {
  try {
    const res = await fetch(`${API_URL}?active=true`);
    if (!res.ok) throw new Error('Ошибка загрузки активных акций');
    const data = await res.json();
    return data.map(mapDbRowToPromotion);
  } catch (error) {
    console.error('Error in getActivePromotions:', error);
    throw error;
  }
};

export const createPromotion = async (promotionData: PromotionFormValues): Promise<Promotion> => {
  try {
    let imageUrl = promotionData.imageUrl || '';
    if (promotionData.imageFile) {
      imageUrl = await uploadProductImage(promotionData.imageFile);
    }
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...promotionData,
        imageurl: imageUrl
      })
    });
    if (!res.ok) throw new Error('Ошибка создания акции');
    return mapDbRowToPromotion(await res.json());
  } catch (error) {
    console.error('Error in createPromotion:', error);
    throw error;
  }
};

export const updatePromotion = async (id: string, promotionData: PromotionFormValues): Promise<Promotion> => {
  try {
    let imageUrl = promotionData.imageUrl || '';
    if (promotionData.imageFile) {
      imageUrl = await uploadProductImage(promotionData.imageFile);
    }
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...promotionData,
        imageurl: imageUrl
      })
    });
    if (!res.ok) throw new Error('Ошибка обновления акции');
    return mapDbRowToPromotion(await res.json());
  } catch (error) {
    console.error('Error in updatePromotion:', error);
    throw error;
  }
};

export const deletePromotion = async (id: string): Promise<void> => {
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Ошибка удаления акции');
  } catch (error) {
    console.error('Error in deletePromotion:', error);
    throw error;
  }
};

export const reorderPromotions = async (promotionIds: string[]): Promise<void> => {
  try {
    const res = await fetch(`${API_URL}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: promotionIds })
    });
    if (!res.ok) throw new Error('Ошибка изменения порядка акций');
  } catch (error) {
    console.error('Error in reorderPromotions:', error);
    throw error;
  }
};
