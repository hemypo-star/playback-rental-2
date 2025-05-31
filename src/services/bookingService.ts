import { BookingPeriod, BookingFormData } from '@/types/product';
import { supabaseServiceClient } from './supabaseClient';
import { getProducts } from './productService';
import { supabase } from '@/integrations/supabase/client';
import { formatDateRu, isDateRangeAvailable } from '@/utils/dateUtils';

export const getBookings = async (): Promise<BookingPeriod[]> => {
  try {
    console.log('Fetching bookings from database...');
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }
    
    console.log('Successfully fetched bookings:', data?.length || 0);
    return data.map(b => ({
      id: b.id,
      productId: b.product_id,
      customerName: b.customer_name,
      customerEmail: b.customer_email,
      customerPhone: b.customer_phone,
      startDate: new Date(b.start_date),
      endDate: new Date(b.end_date),
      status: b.status as BookingPeriod['status'],
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
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('product_id', productId)
      .order('start_date', { ascending: true });
    
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
  status: BookingPeriod['status'];
  totalPrice: number;
  notes?: string;
}): Promise<BookingPeriod> => {
  try {
    const { data, error } = await supabase
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
      status: data.status as BookingPeriod['status'],
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
    console.log('Updating booking status in database:', bookingId, status);
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
    
    console.log('Successfully updated booking status:', data);
    return data;
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

export const deleteBooking = async (bookingId: string): Promise<boolean> => {
  try {
    console.log('Attempting to delete booking with ID:', bookingId);
    
    // First, check if the booking exists
    const { data: existingBooking, error: checkError } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', bookingId)
      .single();
    
    if (checkError) {
      console.error('Error checking if booking exists:', checkError);
      throw new Error(`Booking with ID ${bookingId} does not exist or cannot be accessed`);
    }
    
    console.log('Booking exists, proceeding with deletion:', existingBooking);
    
    // Perform the deletion
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);
    
    if (error) {
      console.error('Error deleting booking:', error);
      throw new Error(`Failed to delete booking: ${error.message}`);
    }
    
    console.log('Successfully deleted booking with ID:', bookingId);
    return true;
  } catch (error) {
    console.error('Error in deleteBooking function:', error);
    throw error;
  }
};

export const getAvailableProducts = async (startDate: Date, endDate: Date) => {
  try {
    console.log("Getting available products between", formatDateRu(startDate, 'yyyy-MM-dd HH:mm'), "and", formatDateRu(endDate, 'yyyy-MM-dd HH:mm'));
    
    // Get all active products
    const products = await getProducts();
    const availableProducts = products.filter(product => product.available);
    
    // If no date range is provided, return all available products
    if (!startDate || !endDate) {
      console.log("No date range provided, returning all available products:", availableProducts.length);
      return availableProducts;
    }
    
    // Get all bookings
    const bookings = await getBookings();
    console.log("Total bookings in system:", bookings.length);
    
    // Filter out products that are booked in the requested period
    const result = availableProducts.filter(product => {
      // Get bookings for this product that are confirmed or pending
      const productBookings = bookings.filter(
        booking => booking.productId === product.id && 
                  ['confirmed', 'pending'].includes(booking.status)
      );
      
      if (productBookings.length === 0) {
        return true; // No bookings for this product, it's available
      }
      
      // Convert bookings to date ranges
      const bookedRanges = productBookings.map(booking => ({
        start: booking.startDate,
        end: booking.endDate
      }));
      
      // Check if the current product quantity can handle another booking
      const overlappingBookingsCount = bookedRanges.filter(range => 
        !(endDate <= range.start || startDate >= range.end)
      ).length;
      
      // Product is available if it has more quantity than overlapping bookings
      const isAvailable = overlappingBookingsCount < (product.quantity || 1);
      
      console.log(`Product ${product.id} (${product.title}): ${isAvailable ? 'available' : 'not available'} - ${overlappingBookingsCount} overlapping bookings out of ${product.quantity} quantity`);
      
      return isAvailable;
    });
    
    console.log("Available products for selected period:", result.length);
    return result;
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};
