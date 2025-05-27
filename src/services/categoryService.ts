
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

export const getCategoryByName = async (name: string): Promise<Category | null> => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .ilike('name', name)
      .maybeSingle();
      
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl,
      order: data.order || 0
    } : null;
  } catch (error) {
    console.error('Error getting category by name:', error);
    return null;
  }
};

export const addCategory = async (categoryData: Partial<Category>): Promise<Category | null> => {
  try {
    // Check if category already exists with similar name (case insensitive)
    if (categoryData.name) {
      const existingCategory = await getCategoryByName(categoryData.name);
      if (existingCategory) {
        console.log(`Category ${categoryData.name} already exists, returning existing category`);
        return existingCategory;
      }
    }
    
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
    console.log('=== SERVICE LAYER DELETE START ===');
    console.log('categoryService.deleteCategory called with ID:', id);
    console.log('ID type in service:', typeof id);
    console.log('ID length in service:', id.length);
    console.log('ID value in service:', id);
    
    // First, let's check if the category exists before trying to delete
    console.log('Checking if category exists before deletion...');
    const { data: existingCategory, error: selectError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .single();
    
    console.log('Category existence check:');
    console.log('- existingCategory:', existingCategory);
    console.log('- selectError:', selectError);
    
    if (selectError) {
      console.error('Error checking category existence:', selectError);
      return false;
    }
    
    if (!existingCategory) {
      console.error('Category not found with ID:', id);
      return false;
    }
    
    console.log('Category found, proceeding with deletion...');
    console.log('Making Supabase delete call...');
    
    // Try delete with count to see how many rows were affected
    const { data, error, count } = await supabase
      .from('categories')
      .delete({ count: 'exact' })
      .eq('id', id)
      .select();
    
    console.log('Supabase delete response:');
    console.log('- data:', data);
    console.log('- error:', error);
    console.log('- count:', count);
    
    if (error) {
      console.error('Supabase error details:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      throw error;
    }
    
    // Check if any rows were actually deleted
    if (count === 0) {
      console.error('No rows were deleted - this indicates RLS or permission issues');
      console.error('The delete query executed but affected 0 rows');
      return false;
    }
    
    console.log(`Successfully deleted ${count} category/categories`);
    console.log('Delete operation completed successfully');
    console.log('=== SERVICE LAYER DELETE SUCCESS ===');
    return true;
  } catch (error) {
    console.error('=== SERVICE LAYER DELETE FAILED ===');
    console.error('Error deleting category:', error);
    console.error('Error type:', typeof error);
    console.error('Error instanceof Error:', error instanceof Error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
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
