
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CalendarIcon } from 'lucide-react';
import ProductImage from '@/components/product/ProductImage';
import { Product } from '@/types/product';
import { useCartContext } from '@/hooks/useCart';
import { toast } from 'sonner';
import { formatPriceRub } from '@/utils/pricingUtils';

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
  const {
    addToCart
  } = useCartContext();
  
  const hasBookingDates = bookingDates?.startDate && bookingDates?.endDate;
  
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasBookingDates) {
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
          {product.available === false && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="bg-white/90 text-black font-medium px-3 py-1 rounded">
                Нет в наличии
              </div>
            </div>
          )}
        </div>
        
        <CardContent className="p-4 flex-grow flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground capitalize">
              {product.category}
            </span>
            {product.quantity > 0 && product.quantity <= 3}
          </div>
          
          <h3 className="font-medium leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {product.title}
          </h3>
          
          <div className="text-xs text-muted-foreground h-[40px] overflow-hidden line-clamp-3">
            {product.description}
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
            variant={hasBookingDates ? "default" : "outline"} 
            className="rounded-full" 
            onClick={handleAddToCart}
            disabled={product.available === false}
          >
            {hasBookingDates ? <ShoppingCart className="h-4 w-4" /> : <CalendarIcon className="h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ProductCard;
