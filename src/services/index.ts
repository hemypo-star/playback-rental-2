
// Export all services individually instead of re-exporting everything
export * from './productService';
export * from './categoryService';
export * from './bookingService';
export * from './authService';

// Export the supabase service explicitly
export { 
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  exportProductsToCSV,
  importProductsFromCSV
} from './supabaseService';

// Export the API service explicitly
export {
  // Add any specific exports from apiService if needed
} from './apiService';
