
import { BookingPeriod, Product } from '@/types/product';

export interface BookingWithProduct extends BookingPeriod {
  product?: Product;
  order_id?: string; // Add order_id to the type
}

export interface GroupedBookingItem {
  product?: Product;
  quantity: number;
  productId: string;
}

export interface GroupedBooking {
  id: string;
  order_id?: string; // Add order_id to grouped bookings
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startDate: Date;
  endDate: Date;
  status: BookingPeriod['status'];
  totalPrice: number;
  notes?: string;
  createdAt: Date;
  items: GroupedBookingItem[];
}
