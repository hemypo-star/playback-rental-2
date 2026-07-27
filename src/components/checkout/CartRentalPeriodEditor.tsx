import BookingCalendar from "@/components/BookingCalendar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock, AlertCircle } from "lucide-react";
import { formatDateRange } from "@/utils/dateUtils";
import { BookingPeriod } from "@/types/product";
import { useState, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

  const handleBookingChange = useCallback((booking: BookingPeriod) => {
    const bookingSignature = `${booking.startDate.getTime()}-${booking.endDate.getTime()}`;
    
    if (bookingSignature !== lastBooking) {
      setLastBooking(bookingSignature);
      onBookingChange(booking);
      
      if (onClose) {
        onClose();
      }
    }
  }, [lastBooking, onBookingChange, onClose]);

  const handleCalendarClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  const isMissingDates = !initialStartDate || !initialEndDate;

  return (
    <Card className={`mb-8 ${isMissingDates ? 'border-destructive/50 shadow-sm' : ''}`}>
      <CardHeader>
        <CardTitle className={isMissingDates ? "text-destructive" : ""}>
          {isMissingDates ? "Выберите время аренды" : "Редактировать время аренды"}
        </CardTitle>
        <CardDescription>
          {isMissingDates 
            ? "Укажите период для расчета стоимости и оформления заказа" 
            : "Вы можете изменить время аренды если нужно"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isMissingDates && (
          <Alert variant="destructive" className="mb-4 bg-destructive/10">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Даты аренды устарели, пожалуйста, выберите новый период
            </AlertDescription>
          </Alert>
        )}
        
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
              Выбранное время аренды: {formatDateRange(selectedBookingTime.startDate, selectedBookingTime.endDate, true)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CartRentalPeriodEditor;