
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, CalendarIcon } from 'lucide-react';
import ProductImage from '@/components/product/ProductImage';
import { Product } from '@/types/product';
import { useCartContext } from '@/hooks/useCart';
import { toast } from 'sonner';

type ProductCardProps = {
  product: Product;
  bookingDates?: {
    startDate?: Date;
    endDate?: Date;
  };
  featured?: boolean;
};

// Helper function for formatting price in rubles
const formatPriceRub = (price: number): string => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

const ProductCard = ({ product, bookingDates, featured = false }: ProductCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCartContext();
  const hasBookingDates = bookingDates?.startDate && bookingDates?.endDate;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasBookingDates) {
      addToCart({
        productId: product.id,
        quantity: 1,
        startDate: bookingDates.startDate!,
        endDate: bookingDates.endDate!,
      });
      toast.success(`Товар "${product.title}" добавлен в корзину`);
    } else {
      navigate(`/product/${product.id}`, {
        state: { scrollTop: true }
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
      className="group"
    >
      <Card className={`overflow-hidden transition-all hover:shadow-md ${
        featured ? 'border-primary/20' : ''
      }`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <ProductImage 
            imageUrl={product.imageUrl} 
            title={product.title} 
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
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground capitalize">
              {product.category}
            </span>
            {product.quantity > 0 && product.quantity <= 3 && (
              <span className="text-xs text-amber-600 font-medium">
                Осталось {product.quantity} шт.
              </span>
            )}
          </div>
          <h3 className="font-medium leading-tight mb-1 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <div className="text-xs text-muted-foreground h-[40px] overflow-hidden">
            {product.description}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex items-center justify-between">
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
            {hasBookingDates ? (
              <ShoppingCart className="h-4 w-4" />
            ) : (
              <CalendarIcon className="h-4 w-4" />
            )}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default ProductCard;
