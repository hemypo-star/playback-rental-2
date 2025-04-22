
import BookingCalendar from "@/components/BookingCalendar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { formatDateRange } from "@/utils/dateUtils";
import { BookingPeriod } from "@/types/product";

interface CartRentalPeriodEditorProps {
  initialStartDate?: Date;
  initialEndDate?: Date;
  onBookingChange: (booking: BookingPeriod) => void;
  selectedBookingTime: BookingPeriod | null;
}

const CartRentalPeriodEditor = ({
  initialStartDate,
  initialEndDate,
  onBookingChange,
  selectedBookingTime
}: CartRentalPeriodEditorProps) => {
  if (!initialStartDate || !initialEndDate) return null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Редактировать время аренды</CardTitle>
        <CardDescription>Вы можете изменить время аренды если нужно</CardDescription>
      </CardHeader>
      <CardContent>
        <BookingCalendar
          onBookingChange={onBookingChange}
          initialStartDate={initialStartDate}
          initialEndDate={initialEndDate}
          isCompact={false}
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
