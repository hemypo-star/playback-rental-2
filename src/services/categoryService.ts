
import { Category } from '@/types/product';
import { supabaseServiceClient, createBucketIfNotExists } from './supabaseClient';

export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabaseServiceClient.from('categories').select('*');
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data?.map(category => ({
      ...category,
      imageUrl: category.imageurl
    })) || [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const { data, error } = await supabaseServiceClient.from('categories').select('*').eq('id', id).single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error getting category by ID:', error);
    return null;
  }
};

export const addCategory = async (categoryData: Partial<Category>): Promise<Category | null> => {
  try {
    // Make sure we're using imageurl for the database column
    const dbData = {
      ...categoryData,
      imageurl: categoryData.imageUrl // Use imageUrl from categoryData
    };
    
    // Remove duplicate imageUrl if it exists since the DB uses imageurl
    if ('imageUrl' in dbData) {
      delete dbData.imageUrl;
    }
    
    const { data, error } = await supabaseServiceClient.from('categories').insert([dbData]).select().single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error adding category:', error);
    return null;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category | null> => {
  try {
    // Make sure we're using imageurl for the database column
    const dbUpdates = {
      ...updates,
      imageurl: updates.imageUrl // Use imageUrl from updates
    };
    
    // Remove duplicate imageUrl if it exists since the DB uses imageurl
    if ('imageUrl' in dbUpdates) {
      delete dbUpdates.imageUrl;
    }
    
    const { data, error } = await supabaseServiceClient.from('categories').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error updating category:', error);
    return null;
  }
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabaseServiceClient.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
};

export const uploadCategoryImage = async (file: File): Promise<string> => {
  try {
    // Create the bucket if it doesn't exist
    await createBucketIfNotExists('categories');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;
    
    // Upload the file
    const { error: uploadError } = await supabaseServiceClient.storage
      .from('categories')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Error uploading category image:', uploadError);
      throw uploadError;
    }

    // Get the public URL
    const { data: publicUrlData } = supabaseServiceClient.storage
      .from('categories')
      .getPublicUrl(filePath);

    console.log('Successfully uploaded category image, public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};
