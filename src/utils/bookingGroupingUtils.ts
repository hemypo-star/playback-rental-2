
import { BookingWithProduct, GroupedBooking } from '@/components/admin/bookings/types';

export const groupBookingsByOrder = (bookings: BookingWithProduct[]): GroupedBooking[] => {
  console.log('Starting grouping process with bookings:', bookings.length);
  
  // Group bookings by order_id
  const groupedMap = new Map<string, GroupedBooking>();

  bookings.forEach(booking => {
    // Use order_id if available, fallback to booking.id for legacy data
    const groupKey = booking.order_id || booking.id;
    
    console.log('Processing booking:', {
      id: booking.id,
      order_id: booking.order_id,
      customer: booking.customerEmail,
      groupKey,
      startDate: booking.startDate,
      endDate: booking.endDate,
      createdAt: booking.createdAt,
      quantity: booking.quantity || 1,
      status: booking.status,
      totalPrice: booking.totalPrice
    });
    
    if (groupedMap.has(groupKey)) {
      // Add product to existing group
      const existingGroup = groupedMap.get(groupKey)!;
      
      // Check if this product is already in the group
      const existingItemIndex = existingGroup.items.findIndex(
        item => item.productId === booking.productId
      );
      
      if (existingItemIndex >= 0) {
        // If product already exists, increase quantity
        existingGroup.items[existingItemIndex].quantity += (booking.quantity || 1);
        console.log(`Merged duplicate product ${booking.productId} - new quantity: ${existingGroup.items[existingItemIndex].quantity}`);
      } else {
        // Add new product to the group
        existingGroup.items.push({
          product: booking.product,
          quantity: booking.quantity || 1,
          productId: booking.productId
        });
        console.log(`Added new product ${booking.productId} to existing group`);
      }
      
      existingGroup.totalPrice += booking.totalPrice || 0;
      
      // IMPROVED: Better status handling - prioritize the most advanced status
      const currentStatus = existingGroup.status;
      const newStatus = booking.status;
      
      // Status priority: completed > confirmed > pending > cancelled
      const statusPriority = {
        'completed': 4,
        'confirmed': 3,
        'pending': 2,
        'cancelled': 1
      };
      
      const currentPriority = statusPriority[currentStatus as keyof typeof statusPriority] || 0;
      const newPriority = statusPriority[newStatus as keyof typeof statusPriority] || 0;
      
      if (newPriority > currentPriority) {
        existingGroup.status = newStatus;
        console.log(`Updated group status from ${currentStatus} to ${newStatus} for better priority`);
      }
      
      // Use the earliest created date for the group
      if (booking.createdAt && new Date(booking.createdAt) < new Date(existingGroup.createdAt)) {
        existingGroup.createdAt = booking.createdAt;
        console.log(`Updated group creation date to earlier time: ${booking.createdAt}`);
      }
      
      console.log('Updated existing group:', {
        id: existingGroup.id,
        order_id: groupKey,
        status: existingGroup.status,
        totalItems: existingGroup.items.length,
        totalQuantity: existingGroup.items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: existingGroup.totalPrice
      });
    } else {
      // Create new group
      const newGroup: GroupedBooking = {
        id: booking.id,
        order_id: groupKey, // Store the order_id in the grouped booking
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
      console.log('Created new group:', {
        id: newGroup.id,
        order_id: groupKey,
        customer: newGroup.customerEmail,
        productId: booking.productId,
        quantity: booking.quantity || 1,
        status: newGroup.status,
        totalPrice: newGroup.totalPrice
      });
    }
  });

  const result = Array.from(groupedMap.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  console.log('Grouping completed:', {
    originalBookings: bookings.length,
    groupedBookings: result.length,
    groups: result.map(g => ({ 
      id: g.id, 
      order_id: g.order_id,
      customer: g.customerEmail,
      status: g.status,
      itemCount: g.items.length, 
      totalPrice: g.totalPrice,
      totalQuantity: g.items.reduce((sum, item) => sum + item.quantity, 0),
      items: g.items.map(item => ({
        productId: item.productId,
        title: item.product?.title,
        quantity: item.quantity
      }))
    }))
  });
  
  return result;
};
