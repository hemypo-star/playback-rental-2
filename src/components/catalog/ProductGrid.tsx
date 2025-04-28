
import { useState } from 'react';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types/product';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ProductGridProps = {
  products: Product[];
  isLoading: boolean;
  bookingDates: {startDate?: Date, endDate?: Date};
  onClearFilters: () => void;
};

const ProductGrid = ({ 
  products, 
  isLoading,
  bookingDates,
  onClearFilters 
}: ProductGridProps) => {
  const [visibleProducts, setVisibleProducts] = useState(8);

  const handleLoadMore = () => {
    setVisibleProducts(prev => prev + 4);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full">
        <Loader2 className="h-10 w-10 animate-spin text-gray-400" />
        <p className="mt-4 text-gray-500">Загружаем оборудование...</p>
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-center">
        <div className="bg-gray-100 rounded-full p-6 mb-4">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-10 w-10 text-gray-400"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 14h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium mb-2">Ничего не найдено</h3>
        <p className="text-gray-500 mb-4 max-w-md">
          К сожалению, по вашему запросу ничего не найдено. Попробуйте изменить параметры поиска.
        </p>
        <Button onClick={onClearFilters} variant="outline">
          Сбросить все фильтры
        </Button>
      </div>
    );
  }

  const currentlyVisible = Math.min(visibleProducts, products.length);
  const hasMoreToLoad = currentlyVisible < products.length;

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-medium">
          Найдено товаров: <span className="text-primary">{products.length}</span>
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.slice(0, visibleProducts).map(product => (
          <ProductCard 
            key={product.id}
            product={product}
            bookingDates={bookingDates}
          />
        ))}
      </div>
      {hasMoreToLoad && (
        <div className="mt-10 text-center">
          <Button 
            onClick={handleLoadMore} 
            variant="outline"
            className="px-8"
          >
            Показать ещё ({products.length - currentlyVisible})
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductGrid;
