
import { supabase } from '@/integrations/supabase/client';
import { Product, Category } from '@/types/product';
import { uploadProductImage, uploadCategoryImage as uploadCategoryImageUtil } from '@/utils/imageUtils';

// Re-export the uploadCategoryImage function
export const uploadCategoryImage = uploadCategoryImageUtil;

// Products
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    
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
    const { data, error } = await supabase
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
    
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
      
    if (error) throw error;
    if (!data) return null;
    
    let imageFileName = product.imageUrl || '';
    
    // If we have an image (file or URL), upload or use it
    if (imageFile) {
      try {
        if (typeof imageFile === 'string') {
          console.log("Using external URL for product image");
          imageFileName = imageFile;
        } else {
          console.log("Uploading image file before creating product");
          // Fix the function call to match the definition in imageUtils.ts
          // uploadProductImage now expects just the file, without a second argument for ID
          imageFileName = await uploadProductImage(imageFile);
        }
        console.log("Image ready, filename/URL:", imageFileName);
      } catch (uploadError) {
        console.error("Error with product image:", uploadError);
        // Continue with product creation even if image handling fails
      }
    }
    
    // Make sure we're using imageurl for the database column and all required fields are present
    const dbProduct = {
      title: product.title || '',
      description: product.description || '',
      price: product.price || 0,
      category: product.category || '',
      imageurl: imageFileName, // Use the uploaded image filename or URL
      quantity: product.quantity || 1,
      available: product.available !== undefined ? product.available : true
    };
    
    // Validate that all required fields have values
    if (!dbProduct.title || !dbProduct.category) {
      throw new Error("Product title and category are required fields");
    }
    
    // Insert the product
    const { data: insertData, error: insertError } = await supabase.from('products').insert([dbProduct]).select().single();
    
    if (insertError) {
      console.error("Error inserting product:", insertError);
      throw insertError;
    }
    
    if (!insertData) {
      console.error("No data returned from product insertion");
      return null;
    }
    
    console.log("Product created:", insertData);
    
    // Map imageurl to imageUrl for consistency in the frontend
    return {
      ...insertData,
      imageUrl: insertData.imageurl
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File | string): Promise<Product | null> => {
  try {
    console.log("Updating product:", id, "with updates:", updates, "and image:", typeof imageFile === 'string' ? 'URL' : (imageFile ? 'File' : 'None'));
    
    // If there's an image (file or URL), handle it appropriately
    let fileName = null;
    if (imageFile) {
      console.log("Processing new image for product:", id);
      try {
        if (typeof imageFile === 'string') {
          fileName = imageFile; // Use the URL directly
          console.log("Using external URL for image:", fileName);
        } else {
          // Fix the function call to pass both the file and ID
          fileName = await uploadProductImage(imageFile, id);
          console.log("Image uploaded, filename:", fileName);
        }
      } catch (uploadError) {
        console.error("Error with image:", uploadError);
        // Continue with the update even if the image handling fails
      }
    }
    
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase.from('categories').select('*');
    
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
    const { data, error } = await supabase
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
    
    const { data, error } = await supabase
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
    // Fixed: Pass categoryId as the second parameter to match function signature
    if (imageFile) {
      const imageUrl = await uploadCategoryImage(imageFile, id);
      dbUpdates.imageurl = imageUrl;
    }
    
    // Update the category
    const { data, error } = await supabase
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
    const { error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
      await supabase.from('products').insert([productData]);
    }
    
    return products;
  } catch (error) {
    console.error('Error importing products from CSV:', error);
    return [];
  }
};
