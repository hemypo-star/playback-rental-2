
import { Product } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
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

export const createProduct = async (product: Partial<Product>, imageFile?: File | string): Promise<Product | null> => {
  try {
    console.log("Creating product:", product, "with image:", typeof imageFile === 'string' ? 'URL' : (imageFile ? 'File' : 'None'));
    
    let imageFileName = product.imageUrl || '';
    
    // If we have an image (file or URL), upload or use it
    if (imageFile) {
      try {
        if (typeof imageFile === 'string') {
          console.log("Using external URL for product image:", imageFile);
          imageFileName = imageFile;
        } else {
          console.log("Uploading image file before creating product");
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
    
    console.log("Inserting product with imageurl:", dbProduct.imageurl);
    
    // Insert the product
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
          fileName = await uploadProductImage(imageFile, id);
          console.log("Image uploaded, filename:", fileName);
        }
      } catch (uploadError) {
        console.error("Error with image:", uploadError);
        // Continue with the update even if the image handling fails
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
