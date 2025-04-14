
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import AnimatedTransition from '@/components/AnimatedTransition';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types/product';

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  bookingDates: {
    startDate?: Date;
    endDate?: Date;
  };
  onClearFilters: () => void;
}

const ProductGrid = ({ products, isLoading, bookingDates, onClearFilters }: ProductGridProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">По вашему запросу ничего не найдено</p>
        <Button variant="outline" onClick={onClearFilters}>
          Сбросить фильтры
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {bookingDates.startDate && bookingDates.endDate && (
        <div className="mb-6 p-3 bg-primary/10 rounded-md inline-flex items-center">
          <CalendarIcon className="h-4 w-4 mr-2 text-primary" />
          <span className="text-sm">
            Показаны товары, доступные с {format(bookingDates.startDate, 'dd.MM.yyyy')} по {format(bookingDates.endDate, 'dd.MM.yyyy')}
          </span>
        </div>
      )}
      
      <AnimatedTransition show={true} type="fade">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product}
              selectedStartDate={bookingDates.startDate}
              selectedEndDate={bookingDates.endDate}
            />
          ))}
        </div>
      </AnimatedTransition>
    </div>
  );
};

export default ProductGrid;
