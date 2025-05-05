
import { TabsContent } from '@/components/ui/tabs';
import { BookingPeriod, Product } from '@/types/product';
import DetailsTab from './tabs/DetailsTab';
import AvailabilityTab from './tabs/AvailabilityTab';
import { useState } from 'react';

interface ProductTabsProps {
  product: Product;
  bookings?: BookingPeriod[];
  onBookingChange: (booking: BookingPeriod) => void;
  bookingDates: {
    startDate?: Date;
    endDate?: Date;
  };
}

const ProductTabs = ({
  product,
  bookings = [],
  onBookingChange,
  bookingDates
}: ProductTabsProps) => {
  const [startTime, setStartTime] = useState<string>("10"); // Default to 10:00
  const [endTime, setEndTime] = useState<string>("10");     // Default to 10:00
  
  // Handle the confirm click for the red button
  const handleConfirm = () => {
    if (bookingDates.startDate && bookingDates.endDate) {
      // Create start and end dates with the selected times
      const start = new Date(bookingDates.startDate);
      start.setHours(parseInt(startTime, 10), 0, 0, 0);
      
      const end = new Date(bookingDates.endDate);
      end.setHours(parseInt(endTime, 10), 0, 0, 0);
      
      onBookingChange({
        id: 'temp-id',
        productId: product.id,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        startDate: start,
        endDate: end,
        status: 'pending',
        totalPrice: 0,
        createdAt: new Date(),
        notes: ''
      });
    }
  };
  
  return (
    <>
      <TabsContent value="details">
        <DetailsTab 
          product={product} 
          bookings={bookings} 
          bookingDates={bookingDates}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
        />
      </TabsContent>
      
      <TabsContent value="availability">
        <AvailabilityTab
          product={product}
          bookings={bookings}
          onBookingChange={onBookingChange}
          bookingDates={bookingDates}
          startTime={startTime}
          endTime={endTime}
          onStartTimeChange={setStartTime}
          onEndTimeChange={setEndTime}
          onConfirmTime={handleConfirm}
        />
      </TabsContent>
    </>
  );
};

export default ProductTabs;
