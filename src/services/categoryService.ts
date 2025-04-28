import { createClient } from '@supabase/supabase-js';
import { Category } from '@/types/product';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xwylatyyhqyfwsxfwzmn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDAzMjAsImV4cCI6MjA1ODI3NjMyMH0.csLalsyRWr3iky23InlhaJwU2GIm5ckrW3umInkd9C4';

const supabaseServiceClient = createClient(supabaseUrl, supabaseKey);

export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabaseServiceClient.from('categories').select('*');
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency
    return (data || []).map(category => ({
      ...category,
      imageUrl: category.imageurl,
    }));
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

export const getCategoryById = async (id: string): Promise<Category | null> => {
  try {
    const { data, error } = await supabaseServiceClient.from('categories').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting category by ID:', error);
    return null;
  }
};

export const addCategory = async (categoryData: Partial<Category>): Promise<Category | null> => {
  try {
    const { data, error } = await supabaseServiceClient.from('categories').insert([categoryData]).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding category:', error);
    return null;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<Category | null> => {
  try {
    const { data, error } = await supabaseServiceClient.from('categories').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    // First check if the categories bucket exists, if not create it
    const { data: buckets } = await supabaseServiceClient.storage.listBuckets();
    const categoriesBucketExists = buckets?.some(bucket => bucket.name === 'categories');
    
    if (!categoriesBucketExists) {
      console.log('Categories bucket not found, creating it');
      await supabaseServiceClient.storage.createBucket('categories', {
        public: true,
        fileSizeLimit: 5242880, // 5MB limit
      });
    } else {
      // Ensure bucket is public
      await supabaseServiceClient.storage.updateBucket('categories', {
        public: true,
        fileSizeLimit: 5242880,
      });
    }
    
    const { error } = await supabaseServiceClient.storage
      .from('categories')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error('Error uploading category image:', error);
      throw error;
    }

    const { data: publicUrlData } = supabaseServiceClient.storage
      .from('categories')
      .getPublicUrl(filePath);

    console.log('Successfully uploaded image, public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadCategoryImage:', error);
    throw error;
  }
};
