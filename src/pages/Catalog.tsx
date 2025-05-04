
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import * as productService from '@/services/productService';
import * as categoryService from '@/services/categoryService';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CategorySidebar from '@/components/catalog/CategorySidebar';
import ProductGrid from '@/components/catalog/ProductGrid';

const Catalog = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const locationState = location.state as { 
    activeCategory?: string; 
    startDate?: Date; 
    endDate?: Date; 
    search?: string;
    scrollTop?: boolean;
  } | null;
  
  const [search, setSearch] = useState(locationState?.search || '');
  const [activeTab, setActiveTab] = useState(categoryFromUrl || locationState?.activeCategory || 'all');
  const [bookingDates, setBookingDates] = useState<{startDate?: Date, endDate?: Date}>({
    startDate: locationState?.startDate,
    endDate: locationState?.endDate
  });
  
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getCategories(),
  });
  
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', bookingDates],
    queryFn: () => bookingDates.startDate && bookingDates.endDate 
      ? productService.getAvailableProducts(bookingDates.startDate, bookingDates.endDate)
      : productService.getProducts(),
  });

  useEffect(() => {
    if (categoryFromUrl || locationState?.activeCategory) {
      setActiveTab(categoryFromUrl || locationState?.activeCategory || 'all');
    }
    
    if (locationState?.search) {
      setSearch(locationState.search);
    }
    
    if (locationState?.scrollTop) {
      window.scrollTo(0, 0);
    }
  }, [categoryFromUrl, locationState]);

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
