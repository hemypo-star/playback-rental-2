
import { Product, BookingPeriod } from '@/types/product';

/**
 * Calculates the available quantity for a product considering existing bookings
 * @param product The product to check
 * @param bookings All bookings for the product
 * @param startDate Optional start date to check availability for specific period
 * @param endDate Optional end date to check availability for specific period
 * @returns Available quantity considering active bookings
 */
export const getAvailableQuantity = (
  product: Product,
  bookings: BookingPeriod[] = [],
  startDate?: Date,
  endDate?: Date
): number => {
  if (!product.available) {
    return 0;
  }

  // If no date range provided, return total quantity
  if (!startDate || !endDate) {
    return product.quantity;
  }

  // Filter bookings that overlap with the requested period and sum their quantities
  const overlappingBookedQuantity = bookings
    .filter(booking => 
      ['confirmed', 'pending'].includes(booking.status) &&
      !(new Date(booking.endDate) <= startDate || new Date(booking.startDate) >= endDate)
    )
    .reduce((total, booking) => total + (booking.quantity || 1), 0);

  // Calculate available quantity
  const availableQuantity = product.quantity - overlappingBookedQuantity;
  return Math.max(0, availableQuantity);
};

/**
 * Checks if a product is available for the given quantity and date range
 * @param product The product to check
 * @param bookings All bookings for the product
 * @param requestedQuantity Quantity requested (default: 1)
 * @param startDate Optional start date
 * @param endDate Optional end date
 * @returns Boolean indicating if the requested quantity is available
 */
export const isQuantityAvailable = (
  product: Product,
  bookings: BookingPeriod[] = [],
  requestedQuantity: number = 1,
  startDate?: Date,
  endDate?: Date
): boolean => {
  const availableQuantity = getAvailableQuantity(product, bookings, startDate, endDate);
  return availableQuantity >= requestedQuantity;
};
