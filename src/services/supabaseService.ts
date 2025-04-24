import { createClient } from '@supabase/supabase-js';
import { isDateRangeAvailable } from '@/utils/dateUtils';
import { Category } from '@/types/product';
import { supabase as supabaseClient } from '@/integrations/supabase/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xwylatyyhqyfwsxfwzmn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDAzMjAsImV4cCI6MjA1ODI3NjMyMH0.csLalsyRWr3iky23InlhaJwU2GIm5ckrW3umInkd9C4';

// Using the local client instead of creating a new one
const supabaseServiceClient = createClient(supabaseUrl, supabaseKey);

/**
 * Get all products
 */
export const getProducts = async () => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

/**
 * Get a single product by ID
 */
export const getProductById = async (id: string) => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};

/**
 * Create a new product
 */
export const createProduct = async (product: any) => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').insert([product]).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating product:', error);
    return null;
  }
};

/**
 * Update a product
 */
export const updateProduct = async (id: string, updates: any) => {
  try {
    const { data, error } = await supabaseServiceClient.from('products').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    return null;
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (id: string) => {
  try {
    const { error } = await supabaseServiceClient.from('products').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};

/**
 * Upload product image
 */
export const uploadProductImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data: buckets } = await supabaseServiceClient.storage.listBuckets();
    const categoriesBucketExists = buckets?.some(bucket => bucket.name === 'categories');
    
    if (!categoriesBucketExists) {
      console.log('Categories bucket not found, creating it');
      await supabaseServiceClient.storage.createBucket('categories', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
    }

    if (categoriesBucketExists) {
      await supabaseServiceClient.storage.updateBucket('categories', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
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

/**
 * Get all categories
 */
export const getCategories = async (): Promise<Category[]> => {
  try {
    const { data, error } = await supabaseServiceClient.from('categories').select('*');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};

/**
 * Get category by ID
 */
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

/**
 * Add a category
 */
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

/**
 * Update a category
 */
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

/**
 * Delete a category
 */
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

/**
 * Upload a category image to storage
 */
export const uploadCategoryImage = async (file: File): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data: buckets } = await supabaseServiceClient.storage.listBuckets();
    const categoriesBucketExists = buckets?.some(bucket => bucket.name === 'categories');
    
    if (!categoriesBucketExists) {
      console.log('Categories bucket not found, creating it');
      await supabaseServiceClient.storage.createBucket('categories', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
    }

    if (categoriesBucketExists) {
      await supabaseServiceClient.storage.updateBucket('categories', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
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

/**
 * Get all available products for a specific date range
 */
export const getAvailableProducts = async (startDate: Date, endDate: Date) => {
  try {
    const { data: products } = await supabaseServiceClient.from('products').select('*');
    
    if (!products) return [];
    
    const { data: bookings } = await supabaseServiceClient.from('bookings').select('*').not('status', 'eq', 'cancelled');
    
    if (!bookings) return products;
    
    console.log("Filtering products for availability between", startDate, "and", endDate);
    console.log("Total bookings in system:", bookings.length);
    
    const availableProducts = products.filter(product => {
      if (!product.available) return false;
      
      const productBookings = bookings.filter(booking => booking.product_id === product.id);
      
      if (productBookings.length === 0) {
        return true;
      }
      
      const productBookedRanges = productBookings.map(booking => ({
        start: new Date(booking.start_date),
        end: new Date(booking.end_date)
      }));
      
      return isDateRangeAvailable(startDate, endDate, productBookedRanges);
    });
    
    console.log("Available products count:", availableProducts.length);
    
    return availableProducts;
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};

/**
 * Get all bookings for a specific product
 */
export const getProductBookings = async (productId: string) => {
  try {
    const { data, error } = await supabaseServiceClient
      .from('bookings')
      .select('*')
      .eq('product_id', productId);
    
    if (error) throw error;
    
    return data.map(booking => ({
      id: booking.id,
      productId: booking.product_id,
      startDate: new Date(booking.start_date),
      endDate: new Date(booking.end_date),
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      status: booking.status,
      totalPrice: booking.total_price,
      notes: booking.notes,
      createdAt: new Date(booking.created_at)
    }));
  } catch (error) {
    console.error('Error getting product bookings:', error);
    return [];
  }
};

/**
 * Get all bookings
 */
export const getBookings = async () => {
  try {
    const { data, error } = await supabaseServiceClient.from('bookings').select(`
      id,
      product_id,
      customer_name,
      customer_email,
      customer_phone,
      start_date,
      end_date,
      total_price,
      status,
      notes,
      created_at
    `);
    
    if (error) throw error;
    
    return data.map(booking => ({
      id: booking.id,
      productId: booking.product_id,
      startDate: new Date(booking.start_date),
      endDate: new Date(booking.end_date),
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      status: booking.status,
      totalPrice: booking.total_price,
      notes: booking.notes,
      createdAt: new Date(booking.created_at)
    }));
  } catch (error) {
    console.error('Error getting bookings:', error);
    return [];
  }
};

/**
 * Export products to CSV
 */
export const exportProductsToCSV = async () => {
  try {
    const products = await getProducts();
    
    const headers = ['id', 'title', 'description', 'price', 'category', 'imageurl', 'quantity', 'available'];
    const csvRows = [
      headers.join(','),
      ...products.map(product => 
        headers.map(header => {
          if (typeof product[header as keyof typeof product] === 'string' && product[header as keyof typeof product].includes(',')) {
            return `"${product[header as keyof typeof product]}"`;
          }
          return product[header as keyof typeof product];
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  } catch (error) {
    console.error('Error exporting products to CSV:', error);
    return '';
  }
};

/**
 * Import products from CSV
 */
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

/**
 * Create a new booking
 */
export const createBooking = async (bookingData: any) => {
  try {
    const { data, error } = await supabaseServiceClient
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

/**
 * Update booking status
 */
export const updateBookingStatus = async (bookingId: string, status: string) => {
  try {
    const { data, error } = await supabaseServiceClient
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

/**
 * Mock authentication functions for demo
 */
export const login = async (username: string, password: string) => {
  if (username === 'admin' && password === 'admin123') {
    localStorage.setItem('auth_token', 'demo_token');
    localStorage.setItem('user', JSON.stringify({ username: 'admin', role: 'admin' }));
    return { success: true, token: 'demo_token' };
  }
  return { success: false };
};

export const logout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
};

export const checkAuth = () => {
  return !!localStorage.getItem('auth_token');
};

export const getCurrentUser = () => {
  const userString = localStorage.getItem('user');
  if (userString) {
    return JSON.parse(userString);
  }
  return null;
};
