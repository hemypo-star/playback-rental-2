
import { BookingPeriod, Product } from '@/types/product';

export interface BookingWithProduct extends BookingPeriod {
  product?: Product;
}
