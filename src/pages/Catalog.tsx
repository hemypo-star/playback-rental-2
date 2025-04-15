
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import * as supabaseService from '@/services/supabaseService';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CategorySidebar from '@/components/catalog/CategorySidebar';
import ProductGrid from '@/components/catalog/ProductGrid';

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

  const handleBookingChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setBookingDates({ startDate, endDate });
  };

  const handleClearFilters = () => {
    setSearch('');
    setActiveTab('all');
    setBookingDates({});
    (document.getElementById('search-input') as HTMLInputElement).value = '';
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
      <CatalogHeader
        onSearch={setSearch}
        onBookingChange={handleBookingChange}
        bookingDates={bookingDates}
        searchValue={search}
      />
      
      <div className="container mx-auto px-4 py-8">
        <SidebarProvider defaultOpen>
          <div className="flex gap-8 min-h-[500px]">
            <CategorySidebar
              categories={categories}
              activeTab={activeTab}
              onCategoryChange={setActiveTab}
            />
            <ProductGrid
              products={filteredProducts || []}
              isLoading={isLoading}
              bookingDates={bookingDates}
              onClearFilters={handleClearFilters}
            />
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default Catalog;
