
import { BookingPeriod, BookingFormData } from '@/types/product';
import { supabaseServiceClient } from './supabaseClient';
import { getProducts } from './productService';

export const getBookings = async (): Promise<BookingPeriod[]> => {
  try {
    const { data, error } = await supabaseServiceClient
      .from('bookings')
      .select('*');
    
    if (error) throw error;
    
    return data.map(b => ({
      id: b.id,
      productId: b.product_id,
      customerName: b.customer_name,
      customerEmail: b.customer_email,
      customerPhone: b.customer_phone,
      startDate: new Date(b.start_date),
      endDate: new Date(b.end_date),
      status: b.status,
      totalPrice: b.total_price,
      notes: b.notes || '',
      createdAt: new Date(b.created_at || Date.now())
    }));
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw error;
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

export const createBooking = async (booking: {
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startDate: string;
  endDate: string;
  status: string;
  totalPrice: number;
  notes?: string;
}): Promise<BookingPeriod> => {
  try {
    const { data, error } = await supabaseServiceClient
      .from('bookings')
      .insert({
        product_id: booking.productId,
        customer_name: booking.customerName,
        customer_email: booking.customerEmail,
        customer_phone: booking.customerPhone,
        start_date: booking.startDate,
        end_date: booking.endDate,
        status: booking.status,
        total_price: booking.totalPrice,
        notes: booking.notes || ''
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      productId: data.product_id,
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      customerPhone: data.customer_phone,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      status: data.status,
      totalPrice: data.total_price,
      notes: data.notes || '',
      createdAt: new Date(data.created_at || Date.now())
    };
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
