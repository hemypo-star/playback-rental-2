
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { BookingCalendar } from '@/components/BookingCalendar';
import { format } from 'date-fns';
import SearchBar from './SearchBar';

interface CatalogHeaderProps {
  onSearch: (query: string) => void;
  onBookingChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  bookingDates: {
    startDate?: Date;
    endDate?: Date;
  };
  searchValue: string;
}

const CatalogHeader = ({ onSearch, onBookingChange, bookingDates, searchValue }: CatalogHeaderProps) => {
  const handleBookingChange = (booking: any) => {
    onBookingChange(booking.startDate, booking.endDate);
  };

  return (
    <div className="w-full bg-gradient-to-r from-primary/90 to-primary">
      <div className="container mx-auto px-4 py-16">
        <h1 className="heading-1 text-white mb-6">Каталог техники</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 max-w-4xl">
          <SearchBar onSubmit={onSearch} defaultValue={searchValue} />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-white/90 text-foreground border-0 h-12 min-w-[240px] whitespace-nowrap"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {bookingDates.startDate && bookingDates.endDate 
                  ? `${format(bookingDates.startDate, 'dd.MM.yyyy')} — ${format(bookingDates.endDate, 'dd.MM.yyyy')}`
                  : "Выберите даты"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <BookingCalendar
                onBookingChange={handleBookingChange}
                initialStartDate={bookingDates.startDate}
                initialEndDate={bookingDates.endDate}
                isCompact={true}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default CatalogHeader;
