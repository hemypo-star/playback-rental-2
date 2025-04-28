
// This is a wrapper around our Supabase service to maintain backward compatibility
import { getProducts, getProductById, getBookings, getCategories, 
         getProductBookings, createBooking, updateBookingStatus, 
         exportProductsToCSV, importProductsFromCSV } from './index';
import { Product, BookingPeriod, Category, BookingFormData } from "@/types/product";

type ProductFilterParams = {
  category?: string;
  search?: string;
};

const BitrixService = {
  // Products
  getProducts: async (params?: ProductFilterParams): Promise<Product[]> => {
    const products = await getProducts();
    
    if (!params) return products;
    
    let filtered = [...products];
    
    if (params.category) {
      filtered = filtered.filter(p => p.category === params.category);
    }
    
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  },
  
  getProductById: (id: string): Promise<Product> => {
    return getProductById(id);
  },
  
  // Get available products for a specific date range
  getAvailableProducts: async (startDate: Date, endDate: Date): Promise<Product[]> => {
    const products = await getProducts();
    const bookings = await getBookings();
    
    // Filter out products that have bookings in the requested period
    return products.filter(product => {
      const productBookings = bookings.filter(
        booking => booking.productId === product.id &&
        booking.status !== 'cancelled' &&
        !(new Date(booking.endDate) <= startDate || new Date(booking.startDate) >= endDate)
      );
      
      // If the product has quantity > number of bookings, it's still available
      return productBookings.length < product.quantity;
    });
  },
  
  // Categories
  getCategories: (): Promise<Category[]> => {
    return getCategories();
  },
  
  // Bookings
  createBooking: (bookingData: BookingFormData): Promise<BookingPeriod> => {
    return createBooking(bookingData);
  },
  
  getBookings: (): Promise<BookingPeriod[]> => {
    return getBookings();
  },
  
  getProductBookings: (productId: string): Promise<BookingPeriod[]> => {
    return getProductBookings(productId);
  },
  
  updateBookingStatus: (id: string, status: BookingPeriod['status']): Promise<BookingPeriod> => {
    return updateBookingStatus(id, status);
  },
  
  // Admin functions
  exportProductsToCSV: (): Promise<string> => {
    return exportProductsToCSV();
  },
  
  importProductsFromCSV: (csvContent: string): Promise<Product[]> => {
    return importProductsFromCSV(csvContent);
  }
};

export default BitrixService;
