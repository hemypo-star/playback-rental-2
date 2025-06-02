
import { BookingWithProduct, GroupedBooking } from '@/components/admin/bookings/types';

export const groupBookingsByOrder = (bookings: BookingWithProduct[]): GroupedBooking[] => {
  // Группируем бронирования по одинаковым параметрам заказа
  const groupedMap = new Map<string, GroupedBooking>();

  bookings.forEach(booking => {
    // Создаем ключ для группировки на основе клиента, дат и времени создания
    const groupKey = `${booking.customerEmail}_${booking.customerPhone}_${booking.startDate.getTime()}_${booking.endDate.getTime()}_${booking.createdAt?.getTime() || 0}`;
    
    if (groupedMap.has(groupKey)) {
      // Добавляем товар к существующей группе
      const existingGroup = groupedMap.get(groupKey)!;
      existingGroup.items.push({
        product: booking.product,
        quantity: booking.quantity || 1,
        productId: booking.productId
      });
      existingGroup.totalPrice += booking.totalPrice || 0;
    } else {
      // Создаем новую группу
      groupedMap.set(groupKey, {
        id: booking.id,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        customerPhone: booking.customerPhone,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
        totalPrice: booking.totalPrice || 0,
        notes: booking.notes,
        createdAt: booking.createdAt || new Date(),
        items: [{
          product: booking.product,
          quantity: booking.quantity || 1,
          productId: booking.productId
        }]
      });
    }
  });

  return Array.from(groupedMap.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};
