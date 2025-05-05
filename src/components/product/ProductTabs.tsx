
import { TabsContent } from '@/components/ui/tabs';
import { BookingPeriod, Product } from '@/types/product';
import DetailsTab from './tabs/DetailsTab';
import AvailabilityTab from './tabs/AvailabilityTab';

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
  // Handle the confirm click for the red button
  const handleConfirm = () => {
    if (bookingDates.startDate && bookingDates.endDate) {
      onBookingChange({
        id: 'temp-id',
        productId: product.id,
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        startDate: bookingDates.startDate,
        endDate: bookingDates.endDate,
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
        />
      </TabsContent>
      
      <TabsContent value="availability">
        <AvailabilityTab
          product={product}
          bookings={bookings}
          onBookingChange={onBookingChange}
          bookingDates={bookingDates}
          onConfirmTime={handleConfirm}
        />
      </TabsContent>
    </>
  );
};

export default ProductTabs;
