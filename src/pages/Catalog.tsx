
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import * as productService from '@/services/productService';
import * as categoryService from '@/services/categoryService';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CategorySidebar from '@/components/catalog/CategorySidebar';
import ProductGrid from '@/components/catalog/ProductGrid';
import { useIsMobile } from '@/hooks/use-mobile';

const Catalog = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category');
  const isMobile = useIsMobile();
  
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
  
  // Fetch categories directly without excessive dependencies
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch products with proper error handling
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', bookingDates.startDate, bookingDates.endDate],
    queryFn: () => {
      if (bookingDates.startDate && bookingDates.endDate) {
        return productService.getAvailableProducts(bookingDates.startDate, bookingDates.endDate);
      }
      return productService.getProducts();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
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
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) searchInput.value = '';
  };
  
  const filteredProducts = products?.filter(product => {
    const matchesSearch = !search ? true : 
      product.title.toLowerCase().includes(search.toLowerCase()) || 
      product.description.toLowerCase().includes(search.toLowerCase());
      
    const matchesCategory = activeTab === 'all' || product.category === activeTab;
    
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <div className="min-h-screen">
      <CatalogHeader
        onSearch={setSearch}
        onBookingChange={handleBookingChange}
        bookingDates={bookingDates}
        searchValue={search}
      />
      
      {/* Mobile category selector immediately after header */}
      {isMobile && (
        <div className="w-full px-4 mt-4">
          <CategorySidebar
            categories={categories}
            activeTab={activeTab}
            onCategoryChange={setActiveTab}
          />
        </div>
      )}
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8 min-h-[500px] w-full">
          {/* Desktop sidebar, hidden on mobile */}
          {!isMobile && (
            <CategorySidebar
              categories={categories}
              activeTab={activeTab}
              onCategoryChange={setActiveTab}
            />
          )}
          
          <ProductGrid
            products={filteredProducts}
            isLoading={isLoading}
            bookingDates={bookingDates}
            onClearFilters={handleClearFilters}
          />
        </div>
      </div>
    </div>
  );
};

export default Catalog;
