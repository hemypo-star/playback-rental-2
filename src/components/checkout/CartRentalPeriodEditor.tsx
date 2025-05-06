
import BookingCalendar from "@/components/BookingCalendar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatDateRange } from "@/utils/dateUtils";
import { BookingPeriod } from "@/types/product";
import { useState, useEffect, useCallback } from "react";

interface CartRentalPeriodEditorProps {
  initialStartDate?: Date;
  initialEndDate?: Date;
  onBookingChange: (booking: BookingPeriod) => void;
  selectedBookingTime: BookingPeriod | null;
  onClose?: () => void;
}

const CartRentalPeriodEditor = ({
  initialStartDate,
  initialEndDate,
  onBookingChange,
  selectedBookingTime,
  onClose
}: CartRentalPeriodEditorProps) => {
  const [lastBooking, setLastBooking] = useState<string | null>(null);

  // Create a memoized handler to prevent multiple calls with the same data
  const handleBookingChange = useCallback((booking: BookingPeriod) => {
    // Create a unique signature for this booking to detect duplicates
    const bookingSignature = `${booking.startDate.getTime()}-${booking.endDate.getTime()}`;
    
    // Only call onBookingChange if this is a new booking signature
    if (bookingSignature !== lastBooking) {
      setLastBooking(bookingSignature);
      onBookingChange(booking);
      
      // Close the dialog/modal if onClose is provided
      if (onClose) {
        onClose();
      }
    }
  }, [lastBooking, onBookingChange, onClose]);

  // Handle closing
  const handleCalendarClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  if (!initialStartDate || !initialEndDate) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Редактировать время аренды</CardTitle>
        <CardDescription>Вы можете изменить время аренды если нужно</CardDescription>
      </CardHeader>
      <CardContent>
        <BookingCalendar
          onBookingChange={handleBookingChange}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          isCompact={false}
          onClose={handleCalendarClose}
        />
        {selectedBookingTime && (
          <div className="mt-4 p-3 bg-primary/10 rounded-md">
            <p className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Выбранное новое время аренды: {formatDateRange(selectedBookingTime.startDate, selectedBookingTime.endDate, true)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CartRentalPeriodEditor;
