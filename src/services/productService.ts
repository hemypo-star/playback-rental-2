
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { supabaseServiceClient } from '@/services/supabaseClient';
import { getProductImageUrl, uploadProductImage } from '@/utils/imageUtils';

export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase.from('products').select('*');
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
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
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

export const createProduct = async (product: Partial<Product>, imageFile?: File): Promise<Product | null> => {
  try {
    console.log("Creating product:", product, "with image file:", imageFile?.name);
    
    // Make sure we're using imageurl for the database column and all required fields are present
    const dbProduct = {
      title: product.title || '',
      description: product.description || '',
      price: product.price || 0,
      category: product.category || '',
      imageurl: product.imageUrl || '',
      quantity: product.quantity || 1,
      available: product.available !== undefined ? product.available : true
    };
    
    // Validate that all required fields have values
    if (!dbProduct.title || !dbProduct.category) {
      throw new Error("Product title and category are required fields");
    }
    
    // Insert the product first to get an ID
    const { data, error } = await supabase.from('products').insert([dbProduct]).select().single();
    
    if (error) {
      console.error("Error inserting product:", error);
      throw error;
    }
    
    if (!data) {
      console.error("No data returned from product insertion");
      return null;
    }
    
    console.log("Product created:", data);
    
    // If we have an image file, upload it and update the product
    if (imageFile) {
      console.log("Uploading image for product:", data.id);
      try {
        // Upload the image and get the filename (not URL)
        const imageFileName = await uploadProductImage(imageFile, data.id);
        console.log("Image uploaded, filename:", imageFileName);
        
        // Update the product with the image file name
        const { data: updatedData, error: updateError } = await supabase
          .from('products')
          .update({ imageurl: imageFileName })
          .eq('id', data.id)
          .select()
          .single();
          
        if (updateError) {
          console.error("Error updating product with image URL:", updateError);
          throw updateError;
        }
        
        if (updatedData) {
          console.log("Product updated with image:", updatedData);
          // Map imageurl to imageUrl for consistency in the frontend
          return {
            ...updatedData,
            imageUrl: updatedData.imageurl
          };
        }
      } catch (uploadError) {
        console.error("Error in image upload process:", uploadError);
        // Return the product even if the image upload fails
        return {
          ...data,
          imageUrl: data.imageurl
        };
      }
    }
    
    // Map imageurl to imageUrl for consistency in the frontend
    return {
      ...data,
      imageUrl: data.imageurl
    };
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>, imageFile?: File): Promise<Product | null> => {
  try {
    console.log("Updating product:", id, "with updates:", updates, "and image file:", imageFile?.name);
    
    // If there's an image file, upload it first and add the filename to updates (not the full URL)
    let fileName = null;
    if (imageFile) {
      console.log("Uploading new image for product:", id);
      try {
        fileName = await uploadProductImage(imageFile, id);
        console.log("Image uploaded, filename:", fileName);
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        // Continue with the update even if the image upload fails
      }
    }
    
    // Make sure we're using imageurl for the database column
    const dbUpdates: Record<string, any> = {};
    
    // Copy specific updated properties to dbUpdates
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.available !== undefined) dbUpdates.available = updates.available;
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (fileName !== null) dbUpdates.imageurl = fileName;
    else if (updates.imageUrl !== undefined) dbUpdates.imageurl = updates.imageUrl;
    
    // Check if there's anything to update
    if (Object.keys(dbUpdates).length === 0) {
      console.log("No updates to apply, returning existing product");
      return getProductById(id);
    }
    
    console.log("Updating product with:", dbUpdates);
    
    const { data, error } = await supabase
      .from('products')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Error updating product:', error);
      throw error;
    }
    
    console.log("Product updated:", data);
    
    // Map imageurl to imageUrl for consistency in the frontend
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
    const { error } = await supabase.from('products').delete().eq('id', id);
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
      return productBookings.length < (product.quantity || 1);
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
