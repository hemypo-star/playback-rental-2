
import { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, CalendarIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BookingCalendar from '@/components/BookingCalendar';
import PricingCalculator from '@/components/PricingCalculator';
import { getProductById } from '@/services/apiService';
import { getProductBookings } from '@/services/bookingService';
import { BookingPeriod } from '@/types/product';
import { useCartContext } from '@/hooks/useCart';
import ProductImage from '@/components/product/ProductImage';
import ProductTabs from '@/components/product/ProductTabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollToTopLink } from '@/components/ui/navigation-menu';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const locationState = location.state as { startDate?: Date; endDate?: Date } | null;
  
  const [bookingDates, setBookingDates] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({
    startDate: locationState?.startDate,
    endDate: locationState?.endDate
  });
  
  const [addingToCart, setAddingToCart] = useState(false);
  const { addToCart } = useCartContext();
  
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id || ''),
    meta: {
      onError: () => navigate('/catalog')
    }
  });
  
  const { data: bookings, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings', id],
    queryFn: () => getProductBookings(id || ''),
    enabled: !!id
  });

  const handleBookingChange = (bookingPeriod: BookingPeriod) => {
    setBookingDates({
      startDate: bookingPeriod.startDate,
      endDate: bookingPeriod.endDate
    });
  };

  // Check if selected dates conflict with any booking
  const hasDateConflict = bookingDates.startDate && bookingDates.endDate && bookings && 
    bookings.some(booking => 
      booking.startDate.getTime() <= bookingDates.endDate!.getTime() && 
      booking.endDate.getTime() >= bookingDates.startDate!.getTime()
    );

  const handleAddToCart = () => {
    if (!product || !bookingDates.startDate || !bookingDates.endDate || hasDateConflict) return;
    setAddingToCart(true);
    const success = addToCart(product, bookingDates.startDate, bookingDates.endDate);
    if (success) {
      setTimeout(() => {
        setAddingToCart(false);
        navigate('/checkout');
      }, 1000);
    } else {
      setAddingToCart(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h2 className="heading-2 mb-4">Товар не найден</h2>
        <p className="mb-6">Товар, который вы ищете, не существует или был удален.</p>
        <Button asChild>
          <Link to="/catalog">Вернуться в каталог</Link>
        </Button>
      </div>
    );
  }

  // Function to display stock status
  const renderStockStatus = () => {
    if (product.quantity > 3) {
      return (
        <div className="text-green-600 font-medium">
          В наличии: {product.quantity} шт.
        </div>
      );
    } else if (product.quantity > 0) {
      return (
        <div className="text-amber-600 font-medium">
          В наличии: {product.quantity} шт.
        </div>
      );
    } else {
      return (
        <div className="text-red-600 font-medium">
          Нет в наличии
        </div>
      );
    }
  };
  
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <ScrollToTopLink to="/">Главная</ScrollToTopLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <ScrollToTopLink to="/catalog">Каталог</ScrollToTopLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <ScrollToTopLink 
                  to="/catalog" 
                  state={{ activeCategory: product.category, scrollTop: true }}
                >
                  {product.category}
                </ScrollToTopLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ProductImage imageUrl={product.imageUrl} title={product.title} />

          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold">{product.title}</h1>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">{product.price.toLocaleString()} ₽/сутки</div>
              </div>
              
              {/* Display stock status */}
              {renderStockStatus()}
              
              {/* Display full description */}
              {product.description && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-6">
              <h3 className="text-lg font-medium">Заказать оборудование</h3>
              
              <BookingCalendar 
                onBookingChange={handleBookingChange} 
                bookedPeriods={bookings || []} 
                initialStartDate={bookingDates.startDate} 
                initialEndDate={bookingDates.endDate} 
                isCompact={isMobile}
              />

              {bookingDates.startDate && bookingDates.endDate && 
                <PricingCalculator 
                  basePrice={product.price} 
                  startDate={bookingDates.startDate} 
                  endDate={bookingDates.endDate} 
                />
              }

              <Button 
                size="lg" 
                className={`w-full ${hasDateConflict ? 'bg-[#ea384c] hover:bg-[#ea384c]/90' : ''}`}
                disabled={!product.available || !bookingDates.startDate || !bookingDates.endDate || addingToCart || hasDateConflict}
                onClick={handleAddToCart}
              >
                {addingToCart ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    В процессе...
                  </>
                ) : hasDateConflict ? (
                  <>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    Даты недоступны
                  </>
                ) : (
                  <>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {bookingDates.startDate && bookingDates.endDate ? 'Добавить в корзину' : 'Выберите даты'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <Tabs defaultValue="details">
            <TabsList className="mb-8 overflow-x-auto flex w-full justify-start pb-1">
              <TabsTrigger value="details">Подробности</TabsTrigger>
            </TabsList>
            
            <ProductTabs 
              product={product}
              bookings={bookings || []}
              onBookingChange={handleBookingChange}
              bookingDates={bookingDates}
            />
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
