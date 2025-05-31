
import { login as authLogin, logout as authLogout, checkAuth as authCheckAuth } from './authService';

// Authentication
export const login = async (username: string, password: string) => {
  return authLogin(username, password);
};

export const logout = () => {
  authLogout();
};

export const checkAuth = () => {
  return authCheckAuth();
};

// Re-export all required functions from other services
// This file is maintained for backward compatibility
export { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from './productService';
export { getCategories, getCategoryById, addCategory, updateCategory, deleteCategory } from './categoryService';
export { getBookings, getProductBookings, createBooking, updateBookingStatus, deleteBooking } from './bookingService';
export { getSettings, updateSettings } from './settingsService';
