
import { BookingWithProduct, GroupedBooking } from '@/components/admin/bookings/types';

export const groupBookingsByOrder = (bookings: BookingWithProduct[]): GroupedBooking[] => {
  console.log('Starting grouping process with bookings:', bookings.length);
  
  // Группируем бронирования по одинаковым параметрам заказа
  const groupedMap = new Map<string, GroupedBooking>();

  bookings.forEach(booking => {
    // Создаем ключ для группировки на основе клиента и дат (без точного времени создания)
    // Убираем миллисекунды из дат для более надежной группировки
    const startDateKey = new Date(booking.startDate).setMilliseconds(0);
    const endDateKey = new Date(booking.endDate).setMilliseconds(0);
    
    const groupKey = `${booking.customerEmail}_${booking.customerPhone}_${startDateKey}_${endDateKey}`;
    
    console.log('Processing booking:', {
      id: booking.id,
      customer: booking.customerEmail,
      groupKey,
      startDate: booking.startDate,
      endDate: booking.endDate
    });
    
    if (groupedMap.has(groupKey)) {
      // Добавляем товар к существующей группе
      const existingGroup = groupedMap.get(groupKey)!;
      existingGroup.items.push({
        product: booking.product,
        quantity: booking.quantity || 1,
        productId: booking.productId
      });
      existingGroup.totalPrice += booking.totalPrice || 0;
      console.log('Added to existing group:', existingGroup.id, 'Total items:', existingGroup.items.length);
    } else {
      // Создаем новую группу
      const newGroup: GroupedBooking = {
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
      };
      
      groupedMap.set(groupKey, newGroup);
      console.log('Created new group:', newGroup.id);
    }
  });

  const result = Array.from(groupedMap.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  console.log('Grouping completed. Original bookings:', bookings.length, 'Grouped bookings:', result.length);
  console.log('Grouped result:', result.map(g => ({ id: g.id, itemCount: g.items.length, totalPrice: g.totalPrice })));
  
  return result;
};
