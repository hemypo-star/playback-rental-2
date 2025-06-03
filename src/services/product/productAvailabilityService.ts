
import { Product } from '@/types/product';
import { getAvailableProductsOnly } from './productBasicService';

/**
 * Gets products that are available for booking in the given date range
 * @param startDate Start date of the booking
 * @param endDate End date of the booking
 * @returns Array of available products
 */
export const getAvailableProducts = async (startDate: Date, endDate: Date): Promise<Product[]> => {
  try {
    // First get only products that are marked as available
    const availableProducts = await getAvailableProductsOnly();
    const { getBookings } = await import('@/services/bookingService');
    const bookings = await getBookings();
    
    // Filter out products that have bookings in the requested period
    return availableProducts.filter(product => {
      const productBookings = bookings.filter(
        booking => booking.productId === product.id &&
        ['confirmed', 'pending'].includes(booking.status) &&
        !(new Date(booking.endDate) <= startDate || new Date(booking.startDate) >= endDate)
      );
      
      // Calculate total booked quantity for overlapping periods
      const totalBookedQuantity = productBookings.reduce((total, booking) => total + (booking.quantity || 1), 0);
      
      // If the product has quantity > total booked quantity, it's still available
      return totalBookedQuantity < product.quantity;
    });
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};

/**
 * Checks if a specific product is available for the given date range
 * @param productId Product ID to check
 * @param startDate Start date of the booking
 * @param endDate End date of the booking
 * @returns Boolean indicating if the product is available
 */
export const isProductAvailable = async (productId: string, startDate: Date, endDate: Date): Promise<boolean> => {
  try {
    const { getProductById } = await import('./productBasicService');
    const { getProductBookings } = await import('@/services/bookingService');
    
    const product = await getProductById(productId);
    if (!product || !product.available) {
      return false;
    }
    
    const bookings = await getProductBookings(productId);
    const conflictingBookings = bookings.filter(
      booking => ['confirmed', 'pending'].includes(booking.status) &&
      !(new Date(booking.endDate) <= startDate || new Date(booking.startDate) >= endDate)
    );
    
    // Calculate total booked quantity for conflicting periods
    const totalBookedQuantity = conflictingBookings.reduce((total, booking) => total + (booking.quantity || 1), 0);
    
    // Product is available if it has more quantity than total booked quantities
    return totalBookedQuantity < product.quantity;
  } catch (error) {
    console.error('Error checking product availability:', error);
    return false;
  }
};
