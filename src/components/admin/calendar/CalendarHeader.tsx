
import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Category } from '@/types/product';

interface CalendarHeaderProps {
  startDate: Date;
  daysToShow: number;
  filteredCategory: string;
  categories?: Category[];
  onCategoryChange: (category: string) => void;
  onDaysToShowChange: (days: number) => void;
  onStartDateChange: (date: Date) => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onResetToToday: () => void;
}

const CalendarHeader = ({
  startDate,
  daysToShow,
  filteredCategory,
  categories,
  onCategoryChange,
  onDaysToShowChange,
  onStartDateChange,
  onNavigatePrevious,
  onNavigateNext,
  onResetToToday,
}: CalendarHeaderProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Календарь бронирований</h1>
        <p className="text-muted-foreground">
          Шахматка бронирований оборудования
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Select value={filteredCategory} onValueChange={onCategoryChange}>
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
          onValueChange={(value) => onDaysToShowChange(parseInt(value))}
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
                  onStartDateChange(date);
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
          <Button variant="outline" size="icon" onClick={onNavigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onResetToToday}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon" onClick={onNavigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
