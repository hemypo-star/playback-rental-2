
import { Category } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';

export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabase.from('categories').select('*').order('order', { ascending: true });
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data?.map(category => ({
      ...category,
      imageUrl: category.imageurl,
      order: category.order || 0
    })) || [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl,
      order: data.order || 0
    } : null;
  } catch (error) {
    console.error('Error getting category by ID:', error);
    return null;
  }
};

export const addCategory = async (categoryData: Partial<Category>): Promise<Category | null> => {
  try {
    // Make sure we're using imageurl for the database column and required fields are present
    const dbData: any = {
      name: categoryData.name || '', // Ensure name is never undefined
      imageurl: categoryData.imageUrl || '',
      slug: categoryData.slug,
      description: categoryData.description,
      order: categoryData.order || 0
    };
    
    // Validate that required fields exist
    if (!dbData.name) {
      throw new Error('Category name is required');
    }
    
    const { data, error } = await supabase.from('categories').insert([dbData]).select().single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl,
      order: data.order || 0
    } : null;
  } catch (error) {
    console.error('Error adding category:', error);
    return null;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category | null> => {
  try {
    // Make sure we're using imageurl for the database column
    const dbUpdates: Record<string, any> = {};
    
    // Only include defined properties in dbUpdates
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.imageUrl !== undefined) dbUpdates.imageurl = updates.imageUrl;
    if (updates.order !== undefined) dbUpdates.order = updates.order;
    
    const { data, error } = await supabase.from('categories').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl,
      order: data.order || 0
    } : null;
  } catch (error) {
    console.error('Error updating category:', error);
    return null;
  }
};

export const updateCategoriesOrder = async (categories: { id: string, order: number }[]): Promise<boolean> => {
  try {
    // Use Promise.all to execute all updates in parallel
    const updates = categories.map(cat => 
      supabase.from('categories').update({ order: cat.order }).eq('id', cat.id)
    );
    
    await Promise.all(updates);
    return true;
  } catch (error) {
    console.error('Error updating categories order:', error);
    return false;
  }
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
};

export const uploadCategoryImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;
    
    // Use authenticated user for uploading files
    const { error: uploadError } = await supabase.storage
      .from('categories')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading category image:', uploadError);
      throw uploadError;
    }

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('categories')
      .getPublicUrl(filePath);

    console.log('Successfully uploaded category image, public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};
