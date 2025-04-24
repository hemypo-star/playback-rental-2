
import { createClient } from '@supabase/supabase-js';
import { isDateRangeAvailable } from '@/utils/dateUtils';
import { BookingPeriod } from '@/types/product';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xwylatyyhqyfwsxfwzmn.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3eWxhdHl5aHF5ZndzeGZ3em1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI3MDAzMjAsImV4cCI6MjA1ODI3NjMyMH0.csLalsyRWr3iky23InlhaJwU2GIm5ckrW3umInkd9C4';

const supabaseServiceClient = createClient(supabaseUrl, supabaseKey);

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
