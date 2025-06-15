
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import * as productService from '@/services/productService';
import * as categoryService from '@/services/categoryService';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CategorySidebar from '@/components/catalog/CategorySidebar';
import VirtualizedProductGrid from '@/components/catalog/VirtualizedProductGrid';
import { useIsMobile } from '@/hooks/use-mobile';

const Catalog = () => {
  const router = useRouter();
  const { query } = router;

  // Category from query param (Next.js style)
  const categoryFromUrl = typeof query.category === 'string' ? query.category : undefined;

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(categoryFromUrl || 'all');
  const [bookingDates, setBookingDates] = useState<{startDate?: Date, endDate?: Date}>({});

  const isMobile = useIsMobile();

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
    staleTime: 10 * 60 * 1000, // 10 min
  });

  // Products (only available in catalog)
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['catalog-products', bookingDates.startDate, bookingDates.endDate],
    queryFn: () => {
      if (bookingDates.startDate && bookingDates.endDate) {
        return productService.getAvailableProducts(bookingDates.startDate, bookingDates.endDate);
      }
      return productService.getAvailableProductsOnly();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Sync state with URL category
  useEffect(() => {
    if (categoryFromUrl) setActiveTab(categoryFromUrl);
  }, [categoryFromUrl]);

  const handleBookingChange = (startDate: Date | undefined, endDate: Date | undefined) => {
    setBookingDates({ startDate, endDate });
  };

  const handleClearFilters = () => {
    setSearch('');
    setActiveTab('all');
    setBookingDates({});
    if (typeof window !== 'undefined') {
      const searchInput = document.getElementById('search-input') as HTMLInputElement;
      if (searchInput) searchInput.value = '';
    }
    // Remove query param from URL for Next.js
    router.replace({ pathname: router.pathname, query: {} }, undefined, { shallow: true });
  };

  const filteredProducts = products?.filter(product => {
    if (activeTab !== 'all' && product.category_id.toString() !== activeTab) {
      return false;
    }
    if (search) {
      const searchLower = search.toLowerCase();
      const titleMatch = product.title.toLowerCase().includes(searchLower);
      const descMatch = product.description.toLowerCase().includes(searchLower);
      if (!titleMatch && !descMatch) return false;
    }
    return true;
  }) || [];

  // Handle changing categories in sidebar
  const handleCategoryChange = (tab: string) => {
    setActiveTab(tab);
    // Update the URL (Next.js way) but don't reload the page
    if (tab === 'all') {
      router.replace({ pathname: router.pathname, query: {} }, undefined, { shallow: true });
    } else {
      router.replace({ pathname: router.pathname, query: { category: tab } }, undefined, { shallow: true });
    }
  };

  return (
    <div className="min-h-screen">
      <CatalogHeader
        onSearch={setSearch}
        onBookingChange={handleBookingChange}
        bookingDates={bookingDates}
        searchValue={search}
      />

      {isMobile && (
        <div className="w-full px-4 mt-4 max-w-full overflow-hidden">
          <CategorySidebar
            categories={categories}
            activeTab={activeTab}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8 min-h-[500px] w-full">
          {!isMobile && (
            <CategorySidebar
              categories={categories}
              activeTab={activeTab}
              onCategoryChange={handleCategoryChange}
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
