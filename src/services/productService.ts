
import { Product } from '@/types/product';
import { supabaseServiceClient } from './supabaseClient';
import { getProductImageUrl } from '@/utils/imageUtils';

export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').select('*');
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl
    })) || [];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};

export const createProduct = async (product: Partial<Product>): Promise<Product | null> => {
  try {
    // Make sure we're using imageurl for the database column
    const dbProduct = {
      ...product,
      imageurl: product.imageUrl // Use imageUrl from product
    };
    
    // Remove duplicate imageUrl if it exists since the DB uses imageurl
    if ('imageUrl' in dbProduct) {
      delete dbProduct.imageUrl;
    }
    
    const { data, error } = await supabaseServiceClient.from('products').insert([dbProduct]).select().single();
    if (error) throw error;
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error creating product:', error);
    return null;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product | null> => {
  try {
    // Check if there's anything to update
    if (Object.keys(updates).length === 0) {
      // If there are no updates, return the existing product
      return getProductById(id);
    }
    
    // Make sure we're using imageurl for the database column
    const dbUpdates: Record<string, any> = {};
    
    // Copy all updates to dbUpdates
    Object.keys(updates).forEach(key => {
      const productKey = key as keyof Partial<Product>;
      dbUpdates[key] = updates[productKey];
    });
    
    // Handle the imageUrl -> imageurl mapping specifically
    if ('imageUrl' in updates && updates.imageUrl !== undefined) {
      dbUpdates.imageurl = updates.imageUrl;
      // Remove the camelCase version to avoid conflicts
      delete dbUpdates.imageUrl;
    }
    
    const { data, error } = await supabaseServiceClient
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating product:', error);
      return null;
    }
    
    // Map imageurl to imageUrl for consistency in the frontend
    return data ? {
      ...data,
      imageUrl: data.imageurl
    } : null;
  } catch (error) {
    console.error('Error updating product:', error);
    return null;
  }
};

export const deleteProduct = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabaseServiceClient.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
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

export const uploadProductImage = async (file: File, productId?: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;
    
    // Upload the file with product_id in metadata if available
    const uploadOptions: { upsert: boolean; metadata?: { product_id: string } } = { 
      upsert: true 
    };
    
    // Add metadata if productId is provided
    if (productId) {
      uploadOptions.metadata = { 
        product_id: productId 
      };
    }
    
    // Upload the file
    const { error: uploadError } = await supabaseServiceClient.storage
      .from('products')
      .upload(filePath, file, uploadOptions);

    if (uploadError) {
      console.error('Error uploading product image:', uploadError);
      throw uploadError;
    }

    // Get the public URL
    const { data: publicUrlData } = supabaseServiceClient.storage
      .from('products')
      .getPublicUrl(filePath);

    console.log('Successfully uploaded product image, public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
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
