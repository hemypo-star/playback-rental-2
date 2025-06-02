
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CalendarIcon } from 'lucide-react';
import ProductImage from '@/components/product/ProductImage';
import { Product, Category } from '@/types/product';
import { useCartContext } from '@/hooks/useCart';
import { toast } from 'sonner';
import { formatPriceRub } from '@/utils/pricingUtils';
import { useState, useEffect } from 'react';
import { getProductBookings } from '@/services/bookingService';
import { getAvailableQuantity, isQuantityAvailable } from '@/utils/availabilityUtils';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/services/categoryService';

type ProductCardProps = {
  product: Product;
  bookingDates?: {
    startDate?: Date;
    endDate?: Date;
  };
  featured?: boolean;
};

const ProductCard = ({
  product,
  bookingDates,
  featured = false
}: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCartContext();
  
  const hasBookingDates = bookingDates?.startDate && bookingDates?.endDate;
  
  // Load categories to get category name by ID
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
  
  // Load product bookings with shorter stale time for real-time updates
  const { data: productBookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['product-bookings', product.id],
    queryFn: () => getProductBookings(product.id),
    staleTime: 30 * 1000, // 30 seconds - shorter for real-time updates
    refetchInterval: 60 * 1000, // Refetch every minute
    enabled: !!product.id
  });
  
  // Find the category name for this product
  const categoryName = categories?.find(cat => cat.category_id === product.category_id)?.name || 'Без категории';
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasBookingDates && isAvailableForDates) {
      addToCart(product, bookingDates.startDate, bookingDates.endDate);
      toast.success(`Товар "${product.title}" добавлен в корзину`);
    } else {
      navigate(`/product/${product.id}`, {
        state: {
          scrollTop: true
        }
      });
    }
  };

  // Truncate description to show abbreviation
  const truncateDescription = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Calculate available quantity considering bookings
  const availableQuantity = getAvailableQuantity(
    product, 
    productBookings, 
    bookingDates?.startDate, 
    bookingDates?.endDate
  );
  
  const isAvailableForDates = isQuantityAvailable(
    product, 
    productBookings, 
    1, 
    bookingDates?.startDate, 
    bookingDates?.endDate
  );

  // Determine if product is available considering both general availability and date-specific availability
  const isProductCurrentlyAvailable = () => {
    if (!product.available) return false;
    if (hasBookingDates) {
      return isAvailableForDates;
    }
    return availableQuantity > 0;
  };

  const currentlyAvailable = isProductCurrentlyAvailable();
  
  return (
    <Link 
      to={`/product/${product.id}`} 
      state={{
        prevPath: window.location.pathname,
        bookingDates,
        scrollTop: true
      }} 
      className="group block h-full"
    >
      <Card className={`h-full flex flex-col overflow-hidden transition-all hover:shadow-md ${featured ? 'border-primary/20' : ''}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <ProductImage 
            product={product}
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105" 
          />
          {featured && (
            <div className="absolute top-2 left-2 bg-primary text-white text-xs font-medium px-2 py-1 rounded">
              Популярное
            </div>
          )}
          {!currentlyAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="bg-white/90 text-black font-medium px-3 py-1 rounded">
                {hasBookingDates && !isAvailableForDates ? 'Забронировано на эти даты' : 'Нет в наличии'}
              </div>
            </div>
          )}
        </div>
        
        <CardContent className="p-4 flex-grow flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground capitalize">
              {categoryName}
            </span>
          </div>
          
          <h3 className="font-medium leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {product.title}
          </h3>
          
          {product.description && product.description.trim() && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-grow">
              {truncateDescription(product.description)}
            </p>
          )}
          
          <div className="text-xs mt-auto">
            {isLoadingBookings ? (
              <span className="text-gray-400 font-medium">Проверяем наличие...</span>
            ) : hasBookingDates ? (
              isAvailableForDates ? (
                <span className="text-green-600 font-medium">
                  Доступно: {availableQuantity} шт. на выбранные даты
                </span>
              ) : (
                <span className="text-red-600 font-medium">Забронировано на выбранные даты</span>
              )
            ) : availableQuantity > 0 ? (
              <span className="text-green-600 font-medium">В наличии: {availableQuantity} шт.</span>
            ) : (
              <span className="text-red-600 font-medium">Нет в наличии</span>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 mt-auto flex items-center justify-between">
          <div>
            <div className="font-semibold">
              {formatPriceRub(product.price)} / сутки
            </div>
          </div>
          <Button 
            size="sm" 
            variant={hasBookingDates && currentlyAvailable ? "default" : "outline"} 
            className="rounded-full" 
            onClick={handleAddToCart}
            disabled={!currentlyAvailable}
          >
            {hasBookingDates && currentlyAvailable ? <ShoppingCart className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ProductCard;
