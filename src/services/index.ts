
// Export services from individual modules
export * from './productService';
export * from './categoryService';
export * from './bookingService';
export * from './authService';
export * from './settingsService';
export * from './supabaseClient';
export * from './storageService';

// Deprecated: Use individual service imports instead
// This re-export is maintained for backward compatibility
export { 
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  exportProductsToCSV,
  importProductsFromCSV,
  getAvailableProducts
} from './productService';

export {
  getCategories,
  getCategoryById,
  addCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage
} from './categoryService';

export {
  getBookings,
  getProductBookings,
  createBooking,
  updateBookingStatus
} from './bookingService';

export {
  login,
  signupuser,
  forgotPassword,
  resetPassword,
  logout,
  checkAuth,
  getCurrentUser
} from './authService';

export {
  getSettings,
  updateSettings
} from './settingsService';

export {
  uploadProductImage
} from '@/utils/imageUtils';

