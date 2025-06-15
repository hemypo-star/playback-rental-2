
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import * as productService from '@/services/productService';
import * as categoryService from '@/services/categoryService';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CategorySidebar from '@/components/catalog/CategorySidebar';
import VirtualizedProductGrid from '@/components/catalog/VirtualizedProductGrid';
import { useIsMobile } from '@/hooks/use-mobile';

interface CatalogProps {
  initialCategory?: string;
}

const Catalog = ({ initialCategory }: CatalogProps) => {
  const router = useRouter();
  const { query } = router;

  const categoryFromUrl = (query.category as string) || initialCategory || 'all';
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(categoryFromUrl);
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
    router.replace('/catalog', undefined, { shallow: true });
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
    if (tab === 'all') {
      router.replace('/catalog', undefined, { shallow: true });
    } else {
      router.replace(`/catalog?category=${tab}`, undefined, { shallow: true });
    }
  };

  const activeCategory = categories.find(cat => cat.category_id.toString() === activeTab);
  const pageTitle = activeCategory ? `${activeCategory.name} - Equipment Catalog` : 'Equipment Catalog';
  const pageDescription = activeCategory 
    ? `Browse ${activeCategory.name.toLowerCase()} equipment for rent`
    : 'Browse our complete catalog of professional equipment for rent';

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
      </Head>

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
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const category = query.category as string;

  return {
    props: {
      initialCategory: category || null,
    },
  };
};

export default Catalog;
