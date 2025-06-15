import { BookingPeriod, BookingFormData } from '@/types/product';
import { formatDateRu, isDateRangeAvailable } from '@/utils/dateUtils';

const API_URL = '/api/bookings';

export const getBookings = async (): Promise<BookingPeriod[]> => {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Ошибка загрузки бронирований');
    const data = await res.json();
    return data.map((b: any) => ({
      id: b.id,
      productId: b.product_id,
      customerName: b.customer_name,
      customerEmail: b.customer_email,
      customerPhone: b.customer_phone,
      startDate: new Date(b.start_date),
      endDate: new Date(b.end_date),
      status: b.status,
      totalPrice: b.total_price,
      quantity: b.quantity || 1,
      notes: b.notes || '',
      createdAt: b.created_at ? new Date(b.created_at) : new Date(),
      order_id: b.order_id
    }));
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw error;
  }
};

export const getProductBookings = async (productId: string): Promise<BookingPeriod[]> => {
  try {
    const res = await fetch(`${API_URL}?productId=${encodeURIComponent(productId)}`);
    if (!res.ok) throw new Error('Ошибка загрузки бронирований продукта');
    const data = await res.json();
    return data.map((booking: any) => ({
      id: booking.id,
      productId: booking.product_id,
      startDate: new Date(booking.start_date),
      endDate: new Date(booking.end_date),
      customerName: booking.customer_name,
      customerEmail: booking.customer_email,
      customerPhone: booking.customer_phone,
      status: booking.status,
      totalPrice: booking.total_price,
      quantity: booking.quantity || 1,
      notes: booking.notes || '',
      createdAt: booking.created_at ? new Date(booking.created_at) : new Date(),
      order_id: booking.order_id
    }));
  } catch (error) {
    console.error('Error getting product bookings:', error);
    return [];
  }
};

export const createBooking = async (booking: {
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  startDate: string;
  endDate: string;
  status: BookingPeriod['status'];
  totalPrice: number;
  quantity: number;
  notes?: string;
  order_id?: string;
}): Promise<BookingPeriod> => {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });
    if (!res.ok) throw new Error('Ошибка при создании бронирования');
    const data = await res.json();
    return {
      id: data.id,
      productId: data.product_id,
      customerName: data.customer_name,
      customerEmail: data.customer_email,
      customerPhone: data.customer_phone,
      startDate: new Date(data.start_date),
      endDate: new Date(data.end_date),
      status: data.status,
      totalPrice: data.total_price,
      quantity: data.quantity || 1,
      notes: data.notes || '',
      createdAt: data.created_at ? new Date(data.created_at) : new Date(),
      order_id: data.order_id
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

export const updateBookingStatus = async (bookingId: string, status: BookingPeriod['status']) => {
  try {
    const res = await fetch(`${API_URL}/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Ошибка при обновлении статуса');
    return await res.json();
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

export const deleteBooking = async (bookingId: string): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/${bookingId}`, { method: 'DELETE' });
    return res.ok;
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
};

export const getAvailableProducts = async (startDate: Date, endDate: Date) => {
  try {
    const params = new URLSearchParams({
      start: startDate.toISOString(),
      end: endDate.toISOString()
    });
    const res = await fetch(`/api/products/available?${params.toString()}`);
    if (!res.ok) throw new Error('Ошибка загрузки доступных продуктов');
    return await res.json();
  } catch (error) {
    console.error('Error getting available products:', error);
    return [];
  }
};
