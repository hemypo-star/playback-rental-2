
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router-dom';
import * as productService from '@/services/productService';
import * as categoryService from '@/services/categoryService';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CategorySidebar from '@/components/catalog/CategorySidebar';
import VirtualizedProductGrid from '@/components/catalog/VirtualizedProductGrid';
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
  
  // Fetch categories with optimized caching
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes - longer cache for categories
  });
  
  // Fetch products with optimized query - only available products for catalog
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['catalog-products', bookingDates.startDate, bookingDates.endDate],
    queryFn: () => {
      if (bookingDates.startDate && bookingDates.endDate) {
        return productService.getAvailableProducts(bookingDates.startDate, bookingDates.endDate);
      }
      // For catalog, only show available products
      return productService.getAvailableProductsOnly();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (categoryFromUrl || locationState?.activeCategory) {
      setActiveTab(categoryFromUrl || locationState?.activeCategory || 'all');
    }
    
    if (locationState?.search) {
      setSearch(locationState.search);
    }
    
    if (locationState?.scrollTop) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
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
  
  // Optimize filtering with early returns
  const filteredProducts = products?.filter(product => {
    // Early return for category filter
    if (activeTab !== 'all' && product.category_id.toString() !== activeTab) {
      return false;
    }
    
    // Early return for search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const titleMatch = product.title.toLowerCase().includes(searchLower);
      const descMatch = product.description.toLowerCase().includes(searchLower);
      if (!titleMatch && !descMatch) {
        return false;
      }
    }
    
    return true;
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
        <div className="w-full px-4 mt-4 max-w-full overflow-hidden">
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
          
          <VirtualizedProductGrid
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
