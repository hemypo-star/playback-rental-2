
// Export services from individual modules
export * from './productService'; // This now re-exports from the specialized modules
export * from './categoryService';
export * from './bookingService';
export * from './authService';
export * from './settingsService';
export * from './supabaseClient';
export * from './storageService';
export * from './promotionService';
export * from './productCrudService'; // Export from new module
export * from './productCsvService'; // Export from new module

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
  uploadProductImage,
  getProductImageUrl
} from '@/utils/imageUtils';

export {
  getPromotions,
  getActivePromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  reorderPromotions
} from './promotionService';
