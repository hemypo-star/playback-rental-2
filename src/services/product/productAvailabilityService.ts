
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
      const productBookings = bookings.filter(
        booking => booking.productId === product.id &&
        booking.status !== 'cancelled' &&
        !(new Date(booking.endDate) <= startDate || new Date(booking.startDate) >= endDate)
      );
      
      // If the product has quantity > number of bookings, it's still available
      return productBookings.length < (product.quantity || 1);
    });
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};
