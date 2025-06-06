
import { supabase } from '@/integrations/supabase/client';
import { BookingPeriod } from '@/types/product';

export interface AddBookingItemRequest {
  bookingId: string;
  productId: string;
  quantity: number;
  price: number;
}

export interface UpdateBookingItemRequest {
  bookingId: string;
  productId: string;
  newQuantity: number;
}

// Add a new product to an existing booking
export const addBookingItem = async (request: AddBookingItemRequest): Promise<void> => {
  try {
    console.log('Adding item to booking:', request);
    
    // Get the original booking to maintain the same dates and customer info
    const { data: originalBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', request.bookingId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!originalBooking) throw new Error('Original booking not found');
    
    // Create a new booking entry for the additional item
    const newBookingData = {
      product_id: request.productId,
      customer_name: originalBooking.customer_name,
      customer_email: originalBooking.customer_email,
      customer_phone: originalBooking.customer_phone,
      start_date: originalBooking.start_date,
      end_date: originalBooking.end_date,
      status: originalBooking.status,
      quantity: request.quantity,
      total_price: request.price * request.quantity,
      order_id: originalBooking.order_id || originalBooking.id, // Use order_id or fallback to booking id
      notes: originalBooking.notes
    };
    
    const { error: insertError } = await supabase
      .from('bookings')
      .insert(newBookingData);
    
    if (insertError) throw insertError;
    
    console.log('Successfully added item to booking');
  } catch (error) {
    console.error('Error adding item to booking:', error);
    throw error;
  }
};

// Update quantity of an existing booking item
export const updateBookingItemQuantity = async (request: UpdateBookingItemRequest): Promise<void> => {
  try {
    console.log('Updating booking item quantity:', request);
    
    if (request.newQuantity <= 0) {
      // If quantity is 0 or less, remove the item
      await removeBookingItem(request.bookingId, request.productId);
      return;
    }
    
    // Find the specific booking item to update
    const { data: bookingItem, error: fetchError } = await supabase
      .from('bookings')
      .select('*, products!inner(*)')
      .eq('id', request.bookingId)
      .eq('product_id', request.productId)
      .single();
    
    if (fetchError) throw fetchError;
    if (!bookingItem) throw new Error('Booking item not found');
    
    // Calculate new total price
    const unitPrice = bookingItem.products.price;
    const newTotalPrice = unitPrice * request.newQuantity;
    
    // Update the booking
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        quantity: request.newQuantity,
        total_price: newTotalPrice
      })
      .eq('id', request.bookingId);
    
    if (updateError) throw updateError;
    
    console.log('Successfully updated booking item quantity');
  } catch (error) {
    console.error('Error updating booking item quantity:', error);
    throw error;
  }
};

// Remove a specific product from a booking
export const removeBookingItem = async (bookingId: string, productId: string): Promise<void> => {
  try {
    console.log('Removing item from booking:', { bookingId, productId });
    
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)
      .eq('product_id', productId);
    
    if (error) throw error;
    
    console.log('Successfully removed item from booking');
  } catch (error) {
    console.error('Error removing item from booking:', error);
    throw error;
  }
};

// Get available products for adding to booking (excludes products already in the booking)
export const getAvailableProductsForBooking = async (
  bookingId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> => {
  try {
    console.log('Getting available products for booking:', { bookingId, startDate, endDate });
    
    // Get current booking details
    const { data: currentBooking, error: bookingError } = await supabase
      .from('bookings')
      .select('order_id')
      .eq('id', bookingId)
      .single();
    
    if (bookingError) throw bookingError;
    
    // Get products already in this order
    const orderId = currentBooking.order_id || bookingId;
    const { data: existingItems, error: itemsError } = await supabase
      .from('bookings')
      .select('product_id')
      .eq('order_id', orderId);
    
    if (itemsError) throw itemsError;
    
    const existingProductIds = existingItems?.map(item => item.product_id) || [];
    
    // Get all available products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('available', true);
    
    if (productsError) throw productsError;
    
    // Filter out products that are already in the booking
    const availableProducts = products?.filter(product => 
      !existingProductIds.includes(product.id)
    ) || [];
    
    console.log('Available products for booking:', availableProducts.length);
    return availableProducts;
  } catch (error) {
    console.error('Error getting available products for booking:', error);
    throw error;
  }
};
