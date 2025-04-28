
import { BookingPeriod, BookingFormData } from '@/types/product';
import { supabaseServiceClient } from './supabaseClient';
import { getProducts } from './productService';

export const getBookings = async (): Promise<BookingPeriod[]> => {
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
      status: booking.status as BookingPeriod['status'],
      totalPrice: booking.total_price,
      notes: booking.notes || '',
      createdAt: new Date(booking.created_at || Date.now())
    }));
  } catch (error) {
    console.error('Error getting bookings:', error);
    return [];
  }
};

export const getProductBookings = async (productId: string): Promise<BookingPeriod[]> => {
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
      status: booking.status as BookingPeriod['status'],
      totalPrice: booking.total_price,
      notes: booking.notes || '',
      createdAt: new Date(booking.created_at || Date.now())
    }));
  } catch (error) {
    console.error('Error getting product bookings:', error);
    return [];
  }
};

export const createBooking = async (bookingData: BookingFormData) => {
  try {
    // Convert from BookingFormData to the database structure format
    const dbBooking = {
      product_id: bookingData.productId,
      customer_name: bookingData.name,
      customer_email: bookingData.email,
      customer_phone: bookingData.phone,
      start_date: bookingData.startDate.toISOString(),
      end_date: bookingData.endDate.toISOString(),
      status: 'pending',  // Default status for new bookings
      total_price: 0,      // This should be calculated based on product price and duration
      notes: bookingData.notes || ''
    };
    
    const { data, error } = await supabaseServiceClient
      .from('bookings')
      .insert([dbBooking])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const updateBookingStatus = async (bookingId: string, status: BookingPeriod['status']) => {
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

export const getAvailableProducts = async (startDate: Date, endDate: Date) => {
  try {
    const products = await getProducts();
    const bookings = await getBookings();
    
    console.log("Filtering products for availability between", startDate, "and", endDate);
    console.log("Total bookings in system:", bookings.length);
    
    const availableProducts = products.filter(product => {
      if (!product.available) return false;
      
      const productBookings = bookings.filter(booking => booking.productId === product.id);
      
      if (productBookings.length === 0) {
        return true;
      }
      
      const productBookedRanges = productBookings.map(booking => ({
        start: new Date(booking.startDate),
        end: new Date(booking.endDate)
      }));
      
      // Import this function dynamically to avoid circular dependencies
      const { isDateRangeAvailable } = require('@/utils/dateUtils');
      return isDateRangeAvailable(startDate, endDate, productBookedRanges);
    });
    
    console.log("Available products count:", availableProducts.length);
    
    return availableProducts;
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};
