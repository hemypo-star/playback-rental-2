
import { supabase } from '@/integrations/supabase/client';
import { Product, BookingPeriod } from '@/types/product';

/**
 * Gets all products from the database (for admin use)
 * @returns Array of all products
 */
export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) throw error;
    
    // Map database fields to frontend format
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl,
      category_id: parseInt(product.category) // Convert category string to category_id number
    })) || [];
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

/**
 * Gets a product by ID
 * @param id Product ID
 * @returns Product or null if not found
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    
    // Map database fields to frontend format
    return data ? {
      ...data,
      imageUrl: data.imageurl,
      category_id: parseInt(data.category) // Convert category string to category_id number
    } : null;
  } catch (error) {
    console.error('Error getting product by ID:', error);
    return null;
  }
};

/**
 * Gets only available products from the database (for catalog use)
 * @returns Array of available products
 */
export const getAvailableProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('available', true); // Only get available products
    
    if (error) throw error;
    
    // Map database fields to frontend format
    return data?.map(product => ({
      ...product,
      imageUrl: product.imageurl,
      category_id: parseInt(product.category) // Convert category string to category_id number
    })) || [];
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};

/**
 * Gets all bookings from the database
 * @returns Array of bookings
 */
export const getBookings = async (): Promise<BookingPeriod[]> => {
  try {
    const { data, error } = await supabase.from('bookings').select('*');
    if (error) throw error;
    
    return data?.map(booking => ({
      ...booking,
      productId: booking.product_id,
      startDate: new Date(booking.start_date),
      endDate: new Date(booking.end_date),
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      totalPrice: booking.total_price,
      createdAt: new Date(booking.created_at),
      status: booking.status as "pending" | "confirmed" | "cancelled" | "completed"
    })) || [];
  } catch (error) {
    console.error('Error getting bookings:', error);
    return [];
  }
};

/**
 * Gets bookings for a specific product
 * @param productId Product ID
 * @returns Array of bookings for the product
 */
export const getProductBookings = async (productId: string): Promise<BookingPeriod[]> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('product_id', productId);
    
    if (error) throw error;
    
    return data?.map(booking => ({
      ...booking,
      productId: booking.product_id,
      startDate: new Date(booking.start_date),
      endDate: new Date(booking.end_date),
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      totalPrice: booking.total_price,
      createdAt: new Date(booking.created_at),
      status: booking.status as "pending" | "confirmed" | "cancelled" | "completed"
    })) || [];
  } catch (error) {
    console.error('Error getting product bookings:', error);
    return [];
  }
};

/**
 * Gets all categories from the database
 * @returns Array of categories
 */
export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting categories:', error);
    return [];
  }
};
