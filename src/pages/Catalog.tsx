
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { SearchIcon, Grid2X2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ProductCard from '@/components/ProductCard';
import AnimatedTransition from '@/components/AnimatedTransition';
import * as supabaseService from '@/services/supabaseService';
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BookingPeriod } from '@/types/product';
import { BookingCalendar } from '@/components/BookingCalendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

const Catalog = () => {
  const location = useLocation();
  const locationState = location.state as { startDate?: Date; endDate?: Date } | null;
  
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [bookingDates, setBookingDates] = useState<{startDate?: Date, endDate?: Date}>({
    startDate: locationState?.startDate,
    endDate: locationState?.endDate
  });
  
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => supabaseService.getCategories(),
  });
  
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', bookingDates],
    queryFn: () => bookingDates.startDate && bookingDates.endDate 
      ? supabaseService.getAvailableProducts(bookingDates.startDate, bookingDates.endDate)
      : supabaseService.getProducts(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const searchInput = (document.getElementById('search-input') as HTMLInputElement)?.value;
    setSearch(searchInput || '');
  };
  
  const handleBookingChange = (bookingPeriod: BookingPeriod) => {
    setBookingDates({
      startDate: bookingPeriod.startDate,
      endDate: bookingPeriod.endDate
    });
  };
  
  const filteredProducts = products?.filter(product => {
    const matchesSearch = search ? 
      product.title.toLowerCase().includes(search.toLowerCase()) || 
      product.description.toLowerCase().includes(search.toLowerCase())
      : true;
      
    const matchesCategory = activeTab === 'all' || product.category === activeTab;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-primary/90 to-primary py-16 px-4">
        <div className="container mx-auto">
          <h1 className="heading-1 text-white mb-6">Каталог техники</h1>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 max-w-md w-full">
              <form onSubmit={handleSubmit}>
                <Input
                  id="search-input"
                  placeholder="Поиск оборудования..."
                  className="pl-10 bg-white/90 border-0 h-12"
                  defaultValue={search}
                />
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Button type="submit" className="sr-only">Поиск</Button>
              </form>
            </div>
            
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
      
      <div className="container mx-auto px-4 py-8">
        <SidebarProvider defaultOpen>
          <div className="flex min-h-[500px] w-full">
            <Sidebar variant="inset" collapsible="none" className="w-1/4 min-w-[240px]">
              <SidebarContent>
                <h3 className="font-medium text-sm uppercase text-muted-foreground mb-3 px-3">Категории</h3>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab('all')}
                      isActive={activeTab === 'all'}
                      className="w-full text-left justify-start font-medium"
                    >
                      <Grid2X2Icon className="mr-2 h-4 w-4" />
                      <span>Все категории</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {categories?.map((category) => (
                    <SidebarMenuItem key={category.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(category.name)}
                        isActive={activeTab === category.name}
                        className="w-full text-left justify-start"
                      >
                        <span>{category.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
            </Sidebar>

            <div className="flex-1 pl-6">
              {bookingDates.startDate && bookingDates.endDate && (
                <div className="mb-6 p-3 bg-primary/10 rounded-md inline-flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
                  <span className="text-sm">
                    Показаны товары, доступные с {format(bookingDates.startDate, 'dd.MM.yyyy')} по {format(bookingDates.endDate, 'dd.MM.yyyy')}
                  </span>
                </div>
              )}
              
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : filteredProducts && filteredProducts.length > 0 ? (
                <AnimatedTransition show={true} type="fade">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product}
                        startDate={bookingDates.startDate}
                        endDate={bookingDates.endDate}
                      />
                    ))}
                  </div>
                </AnimatedTransition>
              ) : (
                <div className="text-center py-20">
                  <p className="text-muted-foreground mb-4">По вашему запросу ничего не найдено</p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearch('');
                      setActiveTab('all');
                      setBookingDates({});
                      (document.getElementById('search-input') as HTMLInputElement).value = '';
                    }}
                  >
                    Сбросить фильтры
                  </Button>
                </div>
              )}
            </div>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default Catalog;
