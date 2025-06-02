
export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category_id: number; // Changed from category string to category_id number
  imageUrl: string;
  available: boolean;
  quantity: number;
}

export interface BookingPeriod {
  id: string;
  productId: string; // Updated from productId to match our service
  startDate: Date;
  endDate: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice: number;
  quantity: number; // Added quantity field to track how many items are booked
  notes?: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  category_id: number; // Added the new category_id field
  slug?: string;
  description?: string;
  imageUrl?: string;
  order?: number;
}

export interface BookingFormData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  startDate: Date;
  endDate: Date;
  productId: string;
  notes?: string;
}

export interface ProductFilterParams {
  category?: string;
  available?: boolean;
  search?: string;
}
