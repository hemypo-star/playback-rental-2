
import { format, isWithinInterval, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { BookingPeriod, Product } from '@/types/product';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/services/categoryService';

// Interface for bookings with display name
interface ExtendedBooking extends BookingPeriod {
  productName: string;
  productCategory: string;
}

interface CalendarTableProps {
  days: Date[];
  products: Product[];
  extendedBookings: ExtendedBooking[];
  isLoadingProducts: boolean;
}

const CalendarTable = ({
  days,
  products,
  extendedBookings,
  isLoadingProducts,
}: CalendarTableProps) => {
  
  // Load categories to get category names by ID
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });
  
  // Get status color
  const getStatusColor = (status: BookingPeriod['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-400';
      case 'cancelled':
        return 'bg-red-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Calculate booking span (how many days it spans in the visible range)
  const calculateBookingSpan = (booking: BookingPeriod) => {
    const bookingStart = new Date(booking.startDate);
    const bookingEnd = new Date(booking.endDate);
    
    // Find first visible day that contains the booking
    let firstVisibleDayIndex = days.findIndex(day => 
      isWithinInterval(day, { start: startOfDay(bookingStart), end: endOfDay(bookingEnd) }) ||
      isSameDay(day, bookingStart) || isSameDay(day, bookingEnd)
    );
    
    if (firstVisibleDayIndex === -1) return null;
    
    // If booking starts before visible range, adjust
    if (bookingStart < startOfDay(days[0])) {
      firstVisibleDayIndex = 0;
    }
    
    // Calculate how many days the booking spans in visible range
    let span = 1;
    for (let i = firstVisibleDayIndex + 1; i < days.length; i++) {
      if (days[i] <= endOfDay(bookingEnd)) {
        span++;
      } else {
        break;
      }
    }
    
    return { index: firstVisibleDayIndex, span };
  };

  // Get active bookings for a product
  const getActiveBookingsForProduct = (productId: string) => {
    return extendedBookings
      .filter(booking => booking.productId === productId)
      .map(booking => {
        const span = calculateBookingSpan(booking);
        if (!span) return null;
        return { booking, ...span };
      })
      .filter(Boolean);
  };

  return (
    <div className="rounded-md border bg-card overflow-x-auto">
      <table className="w-full min-w-max">
        <thead>
          <tr className="bg-muted/50">
            <th className="sticky left-0 z-10 bg-muted/50 p-3 text-sm font-medium text-left min-w-[200px] border-r">
              Товар
            </th>
            {days.map((day, index) => (
              <th 
                key={index} 
                className={`p-2 text-center text-sm font-medium min-w-[100px] border-r ${
                  day.getDay() === 0 || day.getDay() === 6 ? 'bg-muted/70' : ''
                }`}
              >
                <div>{format(day, 'EEEEEE', { locale: ru })}</div>
                <div>{format(day, 'dd.MM')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={days.length + 1} className="text-center py-8">
                {isLoadingProducts ? 'Загрузка товаров...' : 'Нет доступных товаров'}
              </td>
            </tr>
          ) : (
            products.map((product) => {
              const productBookings = getActiveBookingsForProduct(product.id);
              
              // Find the category name for this product
              const categoryName = categories?.find(cat => cat.category_id === product.category_id)?.name || 'Без категории';
              
              return (
                <tr key={product.id} className="border-t hover:bg-muted/30">
                  <td className="sticky left-0 z-10 bg-card p-3 font-medium border-r">
                    <div className="flex items-center gap-2">
                      {product.imageUrl && (
                        <div 
                          className="w-8 h-8 rounded bg-center bg-cover flex-shrink-0"
                          style={{ backgroundImage: `url(${product.imageUrl})` }}
                        />
                      )}
                      <div>
                        <div className="truncate max-w-[150px]">{product.title}</div>
                        <div className="text-xs text-muted-foreground">{categoryName}</div>
                      </div>
                    </div>
                  </td>
                  
                  {/* Render booking spans across days */}
                  <td colSpan={days.length} className="relative p-0">
                    <div className="h-12 relative w-full">
                      {productBookings?.map((bookingData, idx) => {
                        if (!bookingData) return null;
                        const { booking, index, span } = bookingData;
                        
                        const leftPosition = (index / days.length) * 100;
                        const width = (span / days.length) * 100;
                        
                        return (
                          <TooltipProvider key={booking.id}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className={`absolute h-6 ${getStatusColor(booking.status)} rounded-sm flex items-center justify-center text-white text-xs whitespace-nowrap overflow-hidden px-2`}
                                  style={{ 
                                    left: `${leftPosition}%`, 
                                    width: `${width}%`,
                                    top: '12px'
                                  }}
                                >
                                  {booking.customerName.split(' ')[0]}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="p-0">
                                <div className="p-3 max-w-[250px]">
                                  <div className="font-medium mb-1">{booking.customerName}</div>
                                  <div className="text-xs mb-2">
                                    {format(new Date(booking.startDate), 'dd.MM.yyyy')} - {format(new Date(booking.endDate), 'dd.MM.yyyy')}
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <div className="text-xs text-muted-foreground">{booking.customerPhone}</div>
                                    <Badge variant="outline">
                                      {booking.status === 'confirmed' 
                                        ? 'Подтверждено' 
                                        : booking.status === 'pending' 
                                        ? 'В ожидании'
                                        : booking.status === 'cancelled'
                                        ? 'Отменено'
                                        : 'Завершено'}
                                    </Badge>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CalendarTable;
