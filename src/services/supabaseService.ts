import { createClient } from '@supabase/supabase-js';
import { Category, Product } from '@/types/product';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xwylatyyhqyfwsxfwzmn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDAzMjAsImV4cCI6MjA1ODI3NjMyMH0.csLalsyRWr3iky23InlhaJwU2GIm5ckrW3umInkd9C4';

const supabaseServiceClient = createClient(supabaseUrl, supabaseKey);

// Authentication
export const checkAuth = () => {
  return localStorage.getItem('auth_token') ? true : false;
};

// Categories
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

// Products
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
    // Make sure we're using imageurl for the database column
    const dbUpdates = {
      ...updates,
      imageurl: updates.imageUrl // Use imageUrl from updates
    };
    
    // Remove duplicate imageUrl if it exists since the DB uses imageurl
    if ('imageUrl' in dbUpdates) {
      delete dbUpdates.imageUrl;
    }
    
    const { data, error } = await supabaseServiceClient.from('products').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    
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

// File uploads
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

export const uploadProductImage = async (file: File): Promise<string> => {
  try {
    // Create the bucket if it doesn't exist
    await createBucketIfNotExists('products');
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = fileName;
    
    // Upload the file
    const { error: uploadError } = await supabaseServiceClient.storage
      .from('products')
      .upload(filePath, file, { upsert: true });

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

// Utility to properly create a bucket with public access
const createBucketIfNotExists = async (bucketName: string) => {
  try {
    // Check if the bucket exists
    const { data: buckets, error: listError } = await supabaseServiceClient.storage.listBuckets();
    
    if (listError) {
      console.error(`Error checking if bucket ${bucketName} exists:`, listError);
      throw listError;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      console.log(`${bucketName} bucket not found, creating it`);
      
      // Create the bucket
      const { data, error } = await supabaseServiceClient.storage.createBucket(bucketName, {
        public: true
      });
      
      if (error) {
        console.error(`Error creating bucket ${bucketName}:`, error);
        throw error;
      }
      
      // Create public policy for the bucket to allow downloads
      const { error: policyError } = await supabaseServiceClient.rpc('create_public_bucket_policy', {
        bucket_name: bucketName
      });
      
      if (policyError) {
        console.error(`Error setting policy for bucket ${bucketName}:`, policyError);
      }
      
      console.log(`Created ${bucketName} bucket with public access`);
    } else {
      console.log(`${bucketName} bucket already exists`);
    }
  } catch (error) {
    console.error(`Error ensuring bucket ${bucketName} exists:`, error);
    throw error;
  }
};

// Utility to create storage policies (we'll call this function once through RPC)
const createPublicPolicy = async (bucketName: string) => {
  try {
    // Make sure bucket is public
    await supabaseServiceClient.storage.updateBucket(bucketName, {
      public: true
    });
    console.log(`Updated ${bucketName} bucket to be public`);
    
    return true;
  } catch (error) {
    console.error(`Error creating public policy for ${bucketName}:`, error);
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

// User authentication
export const login = async (email: string, password: string) => {
  try {
    const { data, error } = await supabaseServiceClient.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }

    localStorage.setItem('auth_token', data.session?.access_token || '');
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error: any) {
    console.error('Error during login:', error.message);
    throw error;
  }
};

export const signupuser = async (email: string, password: string) => {
  try {
    const { data, error } = await supabaseServiceClient.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      throw error;
    }

    localStorage.setItem('auth_token', data.session?.access_token || '');
    localStorage.setItem('user', JSON.stringify(data.user));

    return data;
  } catch (error: any) {
    console.error('Error during signup:', error.message);
    throw error;
  }
};

export const forgotPassword = async (email: string) => {
  try {
    const { data, error } = await supabaseServiceClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error during forgot password:', error.message);
    throw error;
  }
};

export const resetPassword = async (password: string) => {
  try {
    const { data, error } = await supabaseServiceClient.auth.updateUser({ password: password });

    if (error) {
      throw error;
    }

    return data;
  } catch (error: any) {
    console.error('Error during reset password:', error.message);
    throw error;
  }
};

// Bookings
export const getBookings = async () => {
  try {
    const { data, error } = await supabaseServiceClient.from('bookings').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting bookings:', error);
    return [];
  }
};

// Add the missing getProductBookings function
export const getProductBookings = async (productId: string) => {
  try {
    const { data, error } = await supabaseServiceClient.from('bookings').select('*').eq('product_id', productId);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting product bookings:', error);
    return [];
  }
};

export const createBooking = async (bookingData: any) => {
  try {
    const { data, error } = await supabaseServiceClient.from('bookings').insert([bookingData]).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating booking:', error);
    return null;
  }
};

export const updateBookingStatus = async (id: string, status: string) => {
  try {
    const { data, error } = await supabaseServiceClient.from('bookings').update({ status }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating booking status:', error);
    return null;
  }
};

// Settings
export const getSettings = async () => {
  try {
    const { data, error } = await supabaseServiceClient.from('settings').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting settings:', error);
    return [];
  }
};

export const updateSettings = async (key: string, value: string) => {
  try {
    const { data, error } = await supabaseServiceClient.from('settings').update({ value }).eq('key', key).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating settings:', error);
    return null;
  }
};
