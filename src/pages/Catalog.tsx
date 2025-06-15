
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import * as productService from '@/services/productService';
import * as categoryService from '@/services/categoryService';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CategorySidebar from '@/components/catalog/CategorySidebar';
import VirtualizedProductGrid from '@/components/catalog/VirtualizedProductGrid';
import { useIsMobile } from '@/hooks/use-mobile';

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(activeCategory || 'all');
  const [bookingDates, setBookingDates] = useState<{startDate?: Date, endDate?: Date}>({});

  const isMobile = useIsMobile();

  // Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
    staleTime: 10 * 60 * 1000,
  });

  // Products
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

  useEffect(() => {
    if (activeCategory) {
      setActiveTab(activeCategory);
    }
  }, [activeCategory]);

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

  const handleCategoryChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <Layout title="Каталог оборудования" description="Аренда профессионального оборудования">
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
    </Layout>
  );
};

export default Catalog;
