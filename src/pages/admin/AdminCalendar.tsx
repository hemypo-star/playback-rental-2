
import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { getBookings } from '@/services/bookingService';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';
import CalendarHeader from '@/components/admin/calendar/CalendarHeader';
import CalendarTable from '@/components/admin/calendar/CalendarTable';
import StatusLegend from '@/components/admin/calendar/StatusLegend';
import { BookingPeriod } from '@/types/product';

// Interface for bookings with display name
interface ExtendedBooking extends BookingPeriod {
  productName: string;
  productCategory: string;
}

const AdminCalendar = () => {
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [daysToShow, setDaysToShow] = useState(14);
  const [filteredCategory, setFilteredCategory] = useState<string>('');
  const [extendedBookings, setExtendedBookings] = useState<ExtendedBooking[]>([]);

  // Fetch data
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: getBookings
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: getProducts
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  // Combine bookings with product names
  useEffect(() => {
    if (bookings && products && categories) {
      const extended = bookings.map(booking => {
        const product = products.find(p => p.id === booking.productId);
        const categoryName = categories.find(cat => cat.category_id === product?.category_id)?.name || 'Неизвестная категория';
        return {
          ...booking,
          productName: product?.title || 'Неизвестный товар',
          productCategory: categoryName
        } as ExtendedBooking;
      });
      setExtendedBookings(extended);
    }
  }, [bookings, products, categories]);

  // Check if a product has active bookings
  const hasActiveBookings = (productId: string): boolean => {
    return extendedBookings.some(booking => 
      booking.productId === productId && 
      ['confirmed', 'pending'].includes(booking.status)
    );
  };

  // Sort and filter products with active bookings first
  const sortedProducts = useMemo(() => {
    if (!products) return [];

    // First filter by category if selected
    const categoryFiltered = products.filter(product => {
      if (!filteredCategory) return true;
      const categoryName = categories.find(cat => cat.category_id === product.category_id)?.name;
      return categoryName === filteredCategory;
    });

    // Then sort by active bookings
    const productsWithActiveBookings = categoryFiltered.filter(product => 
      hasActiveBookings(product.id)
    );
    
    const productsWithoutActiveBookings = categoryFiltered.filter(product => 
      !hasActiveBookings(product.id)
    );

    // Return products with active bookings first, then the rest
    return [...productsWithActiveBookings, ...productsWithoutActiveBookings];
  }, [products, categories, filteredCategory, extendedBookings]);

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

  if (isLoadingBookings || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <CalendarHeader
        startDate={startDate}
        daysToShow={daysToShow}
        filteredCategory={filteredCategory}
        categories={categories}
        onCategoryChange={setFilteredCategory}
        onDaysToShowChange={setDaysToShow}
        onStartDateChange={setStartDate}
        onNavigatePrevious={navigatePrevious}
        onNavigateNext={navigateNext}
        onResetToToday={resetToToday}
      />
      
      <CalendarTable 
        days={days}
        products={sortedProducts}
        extendedBookings={extendedBookings}
        isLoadingProducts={isLoadingProducts}
        hasActiveBookings={hasActiveBookings}
      />
      
      <StatusLegend />
    </div>
  );
};

export default AdminCalendar;
