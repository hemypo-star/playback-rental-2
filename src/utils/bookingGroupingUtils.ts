import { BookingWithProduct, GroupedBooking } from '@/components/admin/bookings/types';

export const groupBookingsByOrder = (bookings: BookingWithProduct[]): GroupedBooking[] => {
  const groupedMap = new Map<string, GroupedBooking>();

  bookings.forEach(booking => {
    // УМНАЯ ГРУППИРОВКА: Решает проблему дублирования строк.
    let groupKey = booking.order_id;
    
    // Если order_id нет, группируем по email пользователя и времени создания (с точностью до минуты)
    if (!groupKey) {
      const emailKey = booking.customerEmail?.toLowerCase().trim() || 'no-email';
      const timeKey = booking.createdAt 
        ? new Date(booking.createdAt).toISOString().substring(0, 16) // отрезаем секунды
        : 'no-time';
      groupKey = `auto_${emailKey}_${timeKey}`;
    }
    
    if (groupedMap.has(groupKey)) {
      const existingGroup = groupedMap.get(groupKey)!;
      
      const existingItemIndex = existingGroup.items.findIndex(
        item => item.productId === booking.productId
      );
      
      if (existingItemIndex >= 0) {
        existingGroup.items[existingItemIndex].quantity += (booking.quantity || 1);
      } else {
        existingGroup.items.push({
          // @ts-ignore - сохраняем ID для будущего использования
          bookingId: booking.id,
          product: booking.product,
          quantity: booking.quantity || 1,
          productId: booking.productId
        });
      }
      
      existingGroup.totalPrice += booking.totalPrice || 0;
      
      const statusPriority = { 'completed': 4, 'confirmed': 3, 'pending': 2, 'cancelled': 1 };
      const currentPriority = statusPriority[existingGroup.status as keyof typeof statusPriority] || 0;
      const newPriority = statusPriority[booking.status as keyof typeof statusPriority] || 0;
      
      if (newPriority > currentPriority) {
        existingGroup.status = booking.status;
      }
      
      if (booking.createdAt && new Date(booking.createdAt) < new Date(existingGroup.createdAt)) {
        existingGroup.createdAt = booking.createdAt;
      }
    } else {
      const newGroup: GroupedBooking = {
        id: booking.id,
        order_id: groupKey,
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
          // @ts-ignore
          bookingId: booking.id,
          product: booking.product,
          quantity: booking.quantity || 1,
          productId: booking.productId
        }]
      };
      
      groupedMap.set(groupKey, newGroup);
    }
  });

  return Array.from(groupedMap.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getBookingsForOrder = (bookings: BookingWithProduct[], orderId: string): BookingWithProduct[] => {
  return bookings.filter(booking => {
    // Проверяем прямое совпадение
    if (booking.order_id === orderId) return true;
    
    // Проверяем совпадение по нашему авто-сгенерированному ключу
    const emailKey = booking.customerEmail?.toLowerCase().trim() || 'no-email';
    const timeKey = booking.createdAt 
      ? new Date(booking.createdAt).toISOString().substring(0, 16)
      : 'no-time';
    const autoKey = `auto_${emailKey}_${timeKey}`;
    
    return autoKey === orderId || booking.id === orderId;
  });
};

export const validateOrderStatusConsistency = (bookings: BookingWithProduct[], orderId: string) => {
  const orderBookings = getBookingsForOrder(bookings, orderId);
  const statuses = [...new Set(orderBookings.map(b => b.status))];
  
  const statusPriority = { 'completed': 4, 'confirmed': 3, 'pending': 2, 'cancelled': 1 };
  const recommendedStatus = statuses.reduce((highest, current) => {
    const currentPriority = statusPriority[current as keyof typeof statusPriority] || 0;
    const highestPriority = statusPriority[highest as keyof typeof statusPriority] || 0;
    return currentPriority > highestPriority ? current : highest;
  }, statuses[0]);
  
  return { isConsistent: statuses.length === 1, statuses, recommendedStatus };
};