
import { supabase } from '@/integrations/supabase/client';
import { BookingPeriod } from '@/types/product';

export interface OrderStatusUpdate {
  orderId: string;
  newStatus: BookingPeriod['status'];
  bookingIds?: string[];
}

// НОВЫЙ СЕРВИС: Обновляет статус для всех бронирований в заказе
export const updateOrderStatus = async (
  orderId: string, 
  newStatus: BookingPeriod['status']
): Promise<void> => {
  try {
    console.log('Updating order status:', { orderId, newStatus });
    
    // Обновляем статус для всех бронирований с данным order_id
    const { data, error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('order_id', orderId)
      .select();
    
    if (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
    
    console.log('Successfully updated order status:', {
      orderId,
      newStatus,
      updatedBookings: data?.length || 0
    });
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    throw error;
  }
};

// НОВЫЙ СЕРВИС: Анализирует и исправляет inconsistent статусы
export const analyzeAndFixOrderStatuses = async (): Promise<{
  analyzed: number;
  fixed: number;
  issues: Array<{
    orderId: string;
    currentStatuses: string[];
    fixedStatus: string;
  }>;
}> => {
  try {
    console.log('Starting order status analysis and cleanup...');
    
    // Получаем все бронирования с order_id
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .not('order_id', 'is', null);
    
    if (error) throw error;
    
    // Группируем по order_id
    const orderGroups = new Map<string, Array<typeof bookings[0]>>();
    bookings?.forEach(booking => {
      if (booking.order_id) {
        if (!orderGroups.has(booking.order_id)) {
          orderGroups.set(booking.order_id, []);
        }
        orderGroups.get(booking.order_id)!.push(booking);
      }
    });
    
    const issues: Array<{
      orderId: string;
      currentStatuses: string[];
      fixedStatus: string;
    }> = [];
    
    let fixedCount = 0;
    
    const statusPriority = {
      'completed': 4,
      'confirmed': 3,
      'pending': 2,
      'cancelled': 1
    };
    
    // Анализируем каждую группу заказов
    for (const [orderId, orderBookings] of orderGroups) {
      const statuses = [...new Set(orderBookings.map(b => b.status))];
      
      // Если статусы не consistent
      if (statuses.length > 1) {
        console.log(`Found inconsistent statuses for order ${orderId}:`, statuses);
        
        // Определяем правильный статус (наивысший приоритет)
        const correctStatus = statuses.reduce((highest, current) => {
          const currentPriority = statusPriority[current as keyof typeof statusPriority] || 0;
          const highestPriority = statusPriority[highest as keyof typeof statusPriority] || 0;
          return currentPriority > highestPriority ? current : highest;
        }, statuses[0]);
        
        // Обновляем все бронирования в заказе
        await updateOrderStatus(orderId, correctStatus as BookingPeriod['status']);
        
        issues.push({
          orderId,
          currentStatuses: statuses,
          fixedStatus: correctStatus
        });
        
        fixedCount++;
      }
    }
    
    console.log('Order status analysis completed:', {
      totalOrders: orderGroups.size,
      issuesFound: issues.length,
      fixed: fixedCount
    });
    
    return {
      analyzed: orderGroups.size,
      fixed: fixedCount,
      issues
    };
  } catch (error) {
    console.error('Error in analyzeAndFixOrderStatuses:', error);
    throw error;
  }
};

// НОВЫЙ СЕРВИС: Валидирует статус заказа перед обновлением
export const validateStatusUpdate = (
  currentStatus: BookingPeriod['status'],
  newStatus: BookingPeriod['status']
): { isValid: boolean; reason?: string } => {
  // Определяем допустимые переходы статусов
  const allowedTransitions: Record<BookingPeriod['status'], BookingPeriod['status'][]> = {
    'pending': ['confirmed', 'cancelled'],
    'confirmed': ['completed', 'cancelled'],
    'completed': [], // Завершенные заказы нельзя изменить
    'cancelled': ['pending'] // Отмененные можно вернуть в ожидание
  };
  
  const allowed = allowedTransitions[currentStatus] || [];
  
  if (!allowed.includes(newStatus)) {
    return {
      isValid: false,
      reason: `Переход от статуса "${currentStatus}" к "${newStatus}" не разрешен`
    };
  }
  
  return { isValid: true };
};
