import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, format, isWithinInterval, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { BookingPeriod, Product, Category } from '@/types/product';
import * as supabaseService from '@/services/supabaseService';

// Interface for bookings with display name
interface ExtendedBooking extends BookingPeriod {
  productName: string;
  productCategory: string;
}

const AdminCalendar = () => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [daysToShow, setDaysToShow] = useState(14);
  const [filteredCategory, setFilteredCategory] = useState<string>('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [extendedBookings, setExtendedBookings] = useState<ExtendedBooking[]>([]);

  // Fetch data
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: supabaseService.getBookings
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: supabaseService.getProducts
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: supabaseService.getCategories
  });

  // Combine bookings with product names
  useEffect(() => {
    if (bookings && products) {
      const extended = bookings.map(booking => {
        const product = products.find(p => p.id === booking.productId);
        return {
          ...booking,
          productName: product?.title || 'Неизвестный товар',
          productCategory: product?.category || 'Неизвестная категория'
        } as ExtendedBooking;
      });
      setExtendedBookings(extended);
    }
  }, [bookings, products]);

  // Filter products by category
  const filteredProducts = products?.filter(product => 
    !filteredCategory || product.category === filteredCategory
  ) || [];

  // Generate days to display
  const days = Array.from({ length: daysToShow }, (_, i) => 
    addDays(startDate, i)
  );

  // Navigate to previous/next period
  const navigatePrevious = () => {
    setStartDate(addDays(startDate, -daysToShow));
  };

  const navigateNext = () => {
    setStartDate(addDays(startDate, daysToShow));
  };

  // Reset date to today
  const resetToToday = () => {
    setStartDate(new Date());
  };

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

  if (isLoadingBookings || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Календарь бронирований</h1>
          <p className="text-muted-foreground">
            Шахматка бронирований оборудования
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filteredCategory} onValueChange={setFilteredCategory}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Все категории" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все категории</SelectItem>
              {categories?.map((category: Category) => (
                <SelectItem key={category.id} value={category.name}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={daysToShow.toString()} 
            onValueChange={(value) => setDaysToShow(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Период" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 дней</SelectItem>
              <SelectItem value="14">14 дней</SelectItem>
              <SelectItem value="30">30 дней</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(startDate, 'dd.MM.yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  if (date) {
                    setStartDate(date);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
                locale={ru}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetToToday}>
              Сегодня
            </Button>
            <Button variant="outline" size="icon" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
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
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={days.length + 1} className="text-center py-8">
                  {isLoadingProducts ? 'Загрузка товаров...' : 'Нет доступных товаров'}
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => {
                const productBookings = getActiveBookingsForProduct(product.id);
                
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
                          <div className="text-xs text-muted-foreground">{product.category}</div>
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
      
      <div className="mt-6 flex items-center justify-end gap-4">
        <div className="text-sm text-muted-foreground">Статусы:</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-xs">Подтверждено</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-xs">В ожидании</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-xs">Отменено</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-xs">Завершено</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;
