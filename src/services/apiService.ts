
import axios from 'axios';
import { BookingPeriod } from '@/types/product';

const API_URL = 'https://api.example.com';

// Auth related functions
export const login = async (username: string, password: string) => {
  try {
    // For demo purposes, we'll just check hardcoded credentials
    if (username === 'admin' && password === 'admin123') {
      // Store auth token in localStorage
      localStorage.setItem('authToken', 'demo-token-12345');
      localStorage.setItem('user', JSON.stringify({ username, role: 'admin' }));
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false };
  }
};

export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  return true;
};

export const checkAuth = () => {
  const token = localStorage.getItem('authToken');
  return !!token;
};

export const getCurrentUser = () => {
  const userJson = localStorage.getItem('user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

// Product related functions
export const getProducts = async () => {
  try {
    // For demo purposes, we'll return data from supabaseService instead
    // In a real app, this would be an axios call to the API
    const response = await import('@/services/supabaseService').then(module => module.getProducts());
    return response;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

export const getProductById = async (id: string) => {
  try {
    // For demo purposes, we'll return data from supabaseService instead
    const response = await import('@/services/supabaseService').then(module => module.getProductById(id));
    return response;
  } catch (error) {
    console.error(`Error fetching product ${id}:`, error);
    return null;
  }
};

export const createProduct = async (productData: any) => {
  try {
    const response = await axios.post(`${API_URL}/products`, productData);
    return response.data;
  } catch (error) {
    console.error('Error creating product:', error);
    return null;
  }
};

export const updateProduct = async (id: string, productData: any) => {
  try {
    const response = await axios.put(`${API_URL}/products/${id}`, productData);
    return response.data;
  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
    return null;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    await axios.delete(`${API_URL}/products/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting product ${id}:`, error);
    return false;
  }
};

// Category related functions
export const getCategories = async () => {
  try {
    // For demo purposes, we'll return data from supabaseService instead
    const response = await import('@/services/supabaseService').then(module => module.getCategories());
    return response;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

// Booking related functions - Now all bookings come from Supabase
export const getBookings = async (): Promise<BookingPeriod[]> => {
  try {
    const { getBookings } = await import('@/services/supabaseService');
    const bookings = await getBookings();
    return bookings;
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return [];
  }
};

export const getProductBookings = async (productId: string) => {
  try {
    const { getProductBookings } = await import('@/services/supabaseService');
    return await getProductBookings(productId);
  } catch (error) {
    console.error("Error fetching product bookings:", error);
    throw error;
  }
};

export const createBooking = async (bookingData: any): Promise<BookingPeriod | null> => {
  try {
    const { createBooking } = await import('@/services/supabaseService');
    return await createBooking(bookingData);
  } catch (error) {
    console.error('Error creating booking:', error);
    return null;
  }
};
