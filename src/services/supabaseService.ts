import { supabaseServiceClient } from './supabaseClient';
import { Product, Category } from '@/types/product';
import { uploadProductImage, uploadCategoryImage } from '@/utils/imageUtils';

// Products
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').select('*');
    
    if (error) throw error;
    
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl
    })) || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabaseServiceClient
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    return data ? { ...data, imageUrl: data.imageurl } : null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

export const createProduct = async (product: Partial<Product>, imageFile?: File): Promise<Product | null> => {
  try {
    // First create product record
    const productData = {
      title: product.title || '',
      description: product.description || '',
      price: product.price || 0,
      category: product.category || '',
      imageurl: product.imageUrl || '',
      quantity: product.quantity || 1,
      available: product.available !== undefined ? product.available : true
    };
    
    const { data, error } = await supabaseServiceClient
      .from('products')
      .insert([productData])
      .select()
      .single();
      
    if (error) throw error;
    if (!data) return null;
    
    let imageUrl = data.imageurl;
    
    // If we have an image file, upload it and update the product
    if (imageFile) {
      imageUrl = await uploadProductImage(imageFile, data.id);
      
      // Update the product with the image URL
      const { data: updatedData, error: updateError } = await supabaseServiceClient
        .from('products')
        .update({ imageurl: imageUrl })
        .eq('id', data.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      if (updatedData) {
        return {
          ...updatedData,
          imageUrl: updatedData.imageurl
        };
      }
    }
    
    return {
      ...data,
      imageUrl: imageUrl
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File): Promise<Product | null> => {
  try {
    const dbUpdates: any = { ...updates };
    
    // Handle imageUrl -> imageurl mapping
    if (updates.imageUrl !== undefined) {
      dbUpdates.imageurl = updates.imageUrl;
      delete dbUpdates.imageUrl;
    }
    
    // If we have an image file, upload it first
    if (imageFile) {
      const imageUrl = await uploadProductImage(imageFile, id);
      dbUpdates.imageurl = imageUrl;
    }
    
    // Update the product
    const { data, error } = await supabaseServiceClient
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return data ? { 
      ...data,
      imageUrl: data.imageurl 
    } : null;
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabaseServiceClient
      .from('products')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabaseServiceClient.from('categories').select('*');
    
    if (error) throw error;
    
    return data?.map(category => ({
      ...category,
      imageUrl: category.imageurl
    })) || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  try {
    const { data, error } = await supabaseServiceClient
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .single();
      
    if (error) throw error;
    
    return data ? { ...data, imageUrl: data.imageurl } : null;
  } catch (error) {
    console.error('Error fetching category by slug:', error);
    return null;
  }
};

export const addCategory = async (category: { name: string; slug?: string; description?: string; imageUrl?: string }): Promise<Category | null> => {
  try {
    const categoryData = {
      name: category.name,
      slug: category.slug || category.name.toLowerCase().replace(/\s+/g, '-'),
      description: category.description || '',
      imageurl: category.imageUrl || ''
    };
    
    const { data, error } = await supabaseServiceClient
      .from('categories')
      .insert([categoryData])
      .select()
      .single();
      
    if (error) throw error;
    
    return data ? { ...data, imageUrl: data.imageurl } : null;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const updateCategory = async (id: string, updates: Partial<Category>, imageFile?: File): Promise<Category | null> => {
  try {
    const dbUpdates: any = { ...updates };
    
    // Handle imageUrl -> imageurl mapping
    if (updates.imageUrl !== undefined) {
      dbUpdates.imageurl = updates.imageUrl;
      delete dbUpdates.imageUrl;
    }
    
    // If we have an image file, upload it first
    if (imageFile) {
      const imageUrl = await uploadCategoryImage(imageFile, id);
      dbUpdates.imageurl = imageUrl;
    }
    
    // Update the category
    const { data, error } = await supabaseServiceClient
      .from('categories')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    return data ? { 
      ...data,
      imageUrl: data.imageurl 
    } : null;
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabaseServiceClient
      .from('categories')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting category:', error);
    return false;
  }
};

// Settings
export const getSetting = async (key: string): Promise<string | null> => {
  try {
    const { data, error } = await supabaseServiceClient
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
      
    if (error) {
      console.error(`Error getting setting ${key}:`, error);
      return null;
    }
    
    return data ? data.value : null;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return null;
  }
};

export const updateSetting = async (key: string, value: string): Promise<boolean> => {
  try {
    const { error } = await supabaseServiceClient
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });
      
    if (error) {
      console.error(`Error updating setting ${key}:`, error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    return false;
  }
};

// Add the missing getAvailableProducts function
export const getAvailableProducts = async (startDate: Date, endDate: Date): Promise<Product[]> => {
  try {
    const products = await getProducts();
    const { getBookings } = await import('./bookingService');
    const bookings = await getBookings();
    
    // Filter out products that have bookings in the requested period
    return products.filter(product => {
      const productBookings = bookings.filter(
        booking => booking.productId === product.id &&
        booking.status !== 'cancelled' &&
        !(new Date(booking.endDate) <= startDate || new Date(booking.startDate) >= endDate)
      );
      
      // If the product has quantity > number of bookings, it's still available
      return productBookings.length < product.quantity;
    });
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};

// CSV operations
export const exportProductsToCSV = async () => {
  try {
    const products = await getProducts();
    
    const headers = ['id', 'title', 'description', 'price', 'category', 'imageurl', 'quantity', 'available'];
    const csvRows = [
      headers.join(','),
      ...products.map(product => 
        headers.map(header => {
          const value = product[header as keyof typeof product];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  } catch (error) {
    console.error('Error exporting products to CSV:', error);
    return '';
  }
};

export const importProductsFromCSV = async (csvContent: string) => {
  try {
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',');
    
    const products = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',');
      const product: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        let value = values[index];
        
        if (value && value.startsWith('"') && !value.endsWith('"')) {
          let j = index + 1;
          while (j < values.length) {
            value += ',' + values[j];
            if (values[j].endsWith('"')) break;
            j++;
          }
          value = value.substring(1, value.length - 1);
        }
        
        if (header === 'available') {
          product[header] = value.toLowerCase() === 'true';
        } else if (header === 'price' || header === 'quantity') {
          product[header] = Number(value);
        } else {
          product[header] = value;
        }
      });
      
      products.push(product);
    }
    
    for (const product of products) {
      const { id, ...productData } = product;
      await supabaseServiceClient.from('products').insert([productData]);
    }
    
    return products;
  } catch (error) {
    console.error('Error importing products from CSV:', error);
    return [];
  }
};
