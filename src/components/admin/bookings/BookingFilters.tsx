
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { BookingPeriod } from '@/types/product';

interface BookingFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: BookingPeriod['status'] | 'all';
  setStatusFilter: (value: BookingPeriod['status'] | 'all') => void;
}

export const BookingFilters = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
}: BookingFiltersProps) => {
  return (
    <div className="grid gap-4 mb-4">
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-500" />
        <Input 
          type="search" 
          placeholder="Поиск бронирований..." 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          className="bg-gray-100 border-gray-300 focus:ring-primary focus:border-primary" 
        />
      </div>
      <div className="flex items-center space-x-4">
        <label htmlFor="status-filter" className="text-sm font-medium">Статус:</label>
        <select 
          id="status-filter" 
          className="bg-gray-100 border-gray-300 rounded px-4 py-2 text-sm focus:outline-none focus:ring-primary focus:border-primary" 
          value={statusFilter} 
          onChange={e => setStatusFilter(e.target.value as BookingPeriod['status'] | 'all')}
        >
          <option value="all">Все статусы</option>
          <option value="pending">В ожидании</option>
          <option value="confirmed">Подтверждено</option>
          <option value="cancelled">Отменено</option>
          <option value="completed">Завершено</option>
        </select>
      </div>
    </div>
  );
};
