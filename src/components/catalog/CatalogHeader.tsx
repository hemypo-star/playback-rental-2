
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import DateRangePickerRu from '@/components/booking/DateRangePickerRu';
import { format } from 'date-fns';
import SearchBar from './SearchBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';

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
  const isMobile = useIsMobile();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    if (range.start && range.end) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onBookingChange(range.start, range.end);
    }
  };
  
  const handleSearch = (query: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onSearch(query);
  };

  return (
    <div className="w-full bg-gradient-to-r from-primary/90 to-primary">
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <h1 className="heading-1 text-white mb-4 sm:mb-6 text-2xl sm:text-3xl md:text-4xl">Каталог техники</h1>
        <div className="flex flex-col sm:flex-row items-center gap-4 max-w-4xl">
          <SearchBar onSubmit={handleSearch} defaultValue={searchValue} />
          
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="bg-white/90 text-foreground border-0 h-12 w-full sm:w-auto sm:min-w-[240px] whitespace-nowrap"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {bookingDates.startDate && bookingDates.endDate 
                  ? `${format(bookingDates.startDate, 'dd.MM.yyyy HH:00')} — ${format(bookingDates.endDate, 'dd.MM.yyyy HH:00')}`
                  : "Выберите даты"
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <div className="w-full md:w-[700px] max-w-full">
                <DateRangePickerRu
                  onChange={handleDateRangeChange}
                  initialStartDate={bookingDates.startDate}
                  initialEndDate={bookingDates.endDate}
                  onDateConfirmed={() => setIsPopoverOpen(false)}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default CatalogHeader;
