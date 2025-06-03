
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
      createdAt: new Date(booking.created_at)
    })) || [];
  } catch (error) {
    console.error('Error getting bookings:', error);
    return [];
  }
};
