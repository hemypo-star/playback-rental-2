
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
      // Since we now use category_id, we need to filter by category_id
      const categoryId = parseInt(params.category);
      if (!isNaN(categoryId)) {
        filtered = filtered.filter(p => p.category_id === categoryId);
      }
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
  createBooking: async (bookingData: BookingFormData): Promise<BookingPeriod> => {
    // Transform BookingFormData to match the expected createBooking parameter structure
    const bookingParams = {
      productId: bookingData.productId,
      customerName: bookingData.name,
      customerEmail: bookingData.email,
      customerPhone: bookingData.phone,
      startDate: bookingData.startDate.toISOString(),
      endDate: bookingData.endDate.toISOString(),
      status: 'pending' as BookingPeriod['status'],
      totalPrice: bookingData.notes ? parseFloat(bookingData.notes) : 0, // Assuming notes might contain price info
      quantity: 1, // Added missing quantity field
      notes: bookingData.address || ''
    };
    
    const result = await createBooking(bookingParams);
    return result;
  },
  
  getBookings: async (): Promise<BookingPeriod[]> => {
    const bookings = await getBookings();
    return bookings;
  },
  
  getProductBookings: async (productId: string): Promise<BookingPeriod[]> => {
    const bookings = await getProductBookings(productId);
    return bookings;
  },
  
  updateBookingStatus: async (id: string, status: BookingPeriod['status']): Promise<BookingPeriod> => {
    const result = await updateBookingStatus(id, status);
    // Map the database result to BookingPeriod type
    return {
      id: result.id,
      productId: result.product_id,
      startDate: new Date(result.start_date),
      endDate: new Date(result.end_date),
      customerName: result.customer_name,
      customerEmail: result.customer_email,
      customerPhone: result.customer_phone,
      status: result.status as BookingPeriod['status'],
      totalPrice: result.total_price,
      quantity: result.quantity || 1, // Added missing quantity field
      notes: result.notes || '',
      createdAt: new Date(result.created_at || Date.now())
    };
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
