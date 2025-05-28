
import { Product } from '@/types/product';
import { getProducts } from './productBasicService';

/**
 * Gets products that are available for booking in the given date range
 * @param startDate Start date of the booking
 * @param endDate End date of the booking
 * @returns Array of available products
 */
export const getAvailableProducts = async (startDate: Date, endDate: Date): Promise<Product[]> => {
  try {
    const products = await getProducts();
    const { getBookings } = await import('@/services/bookingService');
    const bookings = await getBookings();
    
    // Filter out products that have bookings in the requested period
    return products.filter(product => {
      // Only check availability for products that are marked as available
      if (!product.available) {
        return false;
      }
      
      const productBookings = bookings.filter(
        booking => booking.productId === product.id &&
        ['confirmed', 'pending'].includes(booking.status) &&
        !(new Date(booking.endDate) <= startDate || new Date(booking.startDate) >= endDate)
      );
      
      // If the product has quantity > number of overlapping bookings, it's still available
      return productBookings.length < (product.quantity || 1);
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
    
    // Product is available if it has more quantity than conflicting bookings
    return conflictingBookings.length < (product.quantity || 1);
  } catch (error) {
    console.error('Error checking product availability:', error);
    return false;
  }
};
