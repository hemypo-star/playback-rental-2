
import { BookingPeriod, Product } from '@/types/product';

export interface BookingWithProduct extends BookingPeriod {
  product?: Product;
}

export interface GroupedBooking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startDate: Date;
  endDate: Date;
  status: BookingPeriod['status'];
  totalPrice: number;
  notes?: string;
  createdAt: Date;
  items: {
    product?: Product;
    quantity: number;
    productId: string;
  }[];
}
