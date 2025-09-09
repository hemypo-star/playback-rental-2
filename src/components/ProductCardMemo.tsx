
import React, { memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CalendarIcon } from 'lucide-react';
import ProductImage from '@/components/product/ProductImage';
import { Product } from '@/types/product';
import { useCartContext } from '@/hooks/useCart';
import { toast } from 'sonner';
import { formatPriceRub } from '@/utils/pricingUtils';
import { useBookingDates } from '@/contexts/BookingDatesContext';
import { isValidBookingDate } from '@/utils/dateUtils';

type ProductCardMemoProps = {
  product: Product;
  categoryName: string;
  availableQuantity: number;
  isAvailableForDates: boolean;
  isLoadingBookings: boolean;
  hasBookingDates: boolean;
  bookingDates?: {
    startDate?: Date;
    endDate?: Date;
  };
  featured?: boolean;
};

const ProductCardMemo = memo(({
  product,
  categoryName,
  availableQuantity,
  isAvailableForDates,
  isLoadingBookings,
  hasBookingDates,
  bookingDates,
  featured = false
}: ProductCardMemoProps) => {
  const navigate = useNavigate();
  const { addToCart, isProductInCart } = useCartContext();
  const { startDate: globalStartDate, endDate: globalEndDate } = useBookingDates();
  const productInCart = isProductInCart(product.id);

  // Use props dates if available, otherwise fall back to global dates
  const effectiveStartDate = bookingDates?.startDate || globalStartDate;
  const effectiveEndDate = bookingDates?.endDate || globalEndDate;
  const validStartDate = isValidBookingDate(effectiveStartDate) ? effectiveStartDate : undefined;
  const validEndDate = isValidBookingDate(effectiveEndDate) ? effectiveEndDate : undefined;
  const localHasBookingDates = Boolean(validStartDate && validEndDate);  
  
  const effectiveBookingDates = {
    startDate: validStartDate,
    endDate: validEndDate
  };
  
  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (localHasBookingDates && isAvailableForDates && availableQuantity > 0) {
      try {
        const success = await addToCart(product, validStartDate!, validEndDate!, 1);
        if (success) {
          toast.success(`Товар "${product.title}" добавлен в корзину`);
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
        toast.error('Ошибка при добавлении в корзину');
      }
    } else if (localHasBookingDates && !isAvailableForDates) {
      toast.error('Товар недоступен на выбранные даты');
    } else {
      navigate(`/product/${product.id}`, {
        state: {
          scrollTop: true
        }
      });
    }
  }, [localHasBookingDates, isAvailableForDates, availableQuantity, addToCart, product, effectiveStartDate, effectiveEndDate, navigate]);

  // Memoize truncate function to prevent re-computation
  const truncatedDescription = React.useMemo(() => {
    if (!product.description || !product.description.trim()) return '';
    const maxLength = 80;
    if (product.description.length <= maxLength) return product.description;
    return product.description.substring(0, maxLength).trim() + '...';
  }, [product.description]);

  // Determine if product is available considering both general availability and date-specific availability
  const currentlyAvailable = React.useMemo(() => {
    if (!product.available) return false;
    if (localHasBookingDates) {
      return isAvailableForDates;
    }
    return availableQuantity > 0;
  }, [product.available, localHasBookingDates, isAvailableForDates, availableQuantity]);

  // Memoize the availability status text
  const availabilityStatus = React.useMemo(() => {
    if (isLoadingBookings) {
      return { text: "Проверяем наличие...", className: "text-gray-400 font-medium" };
    }
    
    if (localHasBookingDates) {
      if (isAvailableForDates) {
        return {
          text: `Доступно: ${availableQuantity} шт. на выбранные даты`,
          className: "text-green-600 font-medium"
        };
      } else {
        return {
          text: "Забронировано на выбранные даты",
          className: "text-red-600 font-medium"
        };
      }
    }
    
    if (availableQuantity > 0) {
      return {
        text: `В наличии: ${availableQuantity} шт.`,
        className: "text-green-600 font-medium"
      };
    } else {
      return {
        text: "Нет в наличии",
        className: "text-red-600 font-medium"
      };
    }
  }, [product.available, localHasBookingDates, isAvailableForDates, availableQuantity]);

  // Memoize formatted price
  const formattedPrice = React.useMemo(() => formatPriceRub(product.price), [product.price]);
  
  return (
    <Link 
      to={`/product/${product.id}`} 
      state={{
        prevPath: window.location.pathname,
        startDate: validStartDate,
        endDate: validEndDate,
        bookingDates: effectiveBookingDates,
        scrollTop: true
      }}
      className="group block h-full"
    >
      <Card className={`h-full flex flex-col overflow-hidden card-hover ${featured ? 'border-primary/20' : ''}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <ProductImage 
            product={product}
            className="h-full w-full object-cover object-center smooth-transition group-hover:scale-105" 
          />
          {featured && (
            <div className="absolute top-2 left-2 bg-primary text-white text-xs font-medium px-2 py-1 rounded">
              Популярное
            </div>
          )}
          {!currentlyAvailable && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="bg-white/90 text-black font-medium px-3 py-1 rounded">
                {localHasBookingDates && !isAvailableForDates ? 'Забронировано на эти даты' : 'Нет в наличии'}
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
          
          <h3 className="font-medium leading-tight mb-2 group-hover:text-primary smooth-transition line-clamp-2">
            {product.title}
          </h3>
          
          {truncatedDescription && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2 flex-grow">
              {truncatedDescription}
            </p>
          )}
          
          <div className="text-xs mt-auto">
            <span className={availabilityStatus.className}>
              {availabilityStatus.text}
            </span>
          </div>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 mt-auto flex items-center justify-between">
          <div>
            <div className="font-semibold">
              {formattedPrice} / сутки
            </div>
          </div>
          <Button 
            size="sm" 
            variant={localHasBookingDates && currentlyAvailable ? "default" : "outline"}
            className={`rounded-full smooth-transition ${productInCart ? 'bg-[#ea384c] hover:bg-[#ea384c]/90 text-white' : ''}`}
            onClick={handleAddToCart}
            disabled={!currentlyAvailable || (localHasBookingDates && availableQuantity === 0)}
          >
            {localHasBookingDates && currentlyAvailable ? <ShoppingCart className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.title === nextProps.product.title &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.imageUrl === nextProps.product.imageUrl &&
    prevProps.product.available === nextProps.product.available &&
    prevProps.categoryName === nextProps.categoryName &&
    prevProps.availableQuantity === nextProps.availableQuantity &&
    prevProps.isAvailableForDates === nextProps.isAvailableForDates &&
    prevProps.isLoadingBookings === nextProps.isLoadingBookings &&
    prevProps.hasBookingDates === nextProps.hasBookingDates &&
    prevProps.featured === nextProps.featured &&
    prevProps.bookingDates?.startDate?.getTime() === nextProps.bookingDates?.startDate?.getTime() &&
    prevProps.bookingDates?.endDate?.getTime() === nextProps.bookingDates?.endDate?.getTime()
  );
});

ProductCardMemo.displayName = 'ProductCardMemo';

export default ProductCardMemo;
