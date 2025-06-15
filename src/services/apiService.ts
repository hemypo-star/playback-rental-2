
import axios from 'axios';

// Create axios instance with base URL for Next.js API routes
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Products
export const getProducts = async (available?: boolean) => {
  const params = available ? { available: 'true' } : {};
  const response = await api.get('/products', { params });
  return response.data.data || response.data;
};

export const getProductById = async (id: string) => {
  const response = await api.get(`/products/${id}`);
  return response.data.data || response.data;
};

export const createProduct = async (productData: any) => {
  const response = await api.post('/products', productData);
  return response.data.data || response.data;
};

export const updateProduct = async (id: string, productData: any) => {
  const response = await api.put(`/products/${id}`, productData);
  return response.data.data || response.data;
};

export const deleteProduct = async (id: string) => {
  const response = await api.delete(`/products/${id}`);
  return response.data;
};

// Categories
export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data.data || response.data;
};

export const getCategoryById = async (id: string) => {
  const response = await api.get(`/categories/${id}`);
  return response.data.data || response.data;
};

// Bookings
export const getBookings = async () => {
  const response = await api.get('/bookings');
  return response.data.data || response.data;
};

export const getProductBookings = async (productId: string) => {
  const response = await api.get(`/bookings/product/${productId}`);
  return response.data.data || response.data;
};

export const createBooking = async (bookingData: any) => {
  const response = await api.post('/bookings', bookingData);
  return response.data.data || response.data;
};

export default api;
