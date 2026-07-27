import { useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, CalendarIcon } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import BookingCalendar from '@/components/BookingCalendar';
import PricingCalculator from '@/components/PricingCalculator';
import QuantitySelector from '@/components/QuantitySelector';
import { getProductById } from '@/services/productService';
import { getProductBookings } from '@/services/bookingService';
import { getCategories } from '@/services/categoryService';
import { BookingPeriod } from '@/types/product';
import { useCartContext } from '@/hooks/useCart';
import ProductImage from '@/components/product/ProductImage';
import ProductTabs from '@/components/product/ProductTabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollToTopLink } from '@/components/ui/navigation-menu';
import { getAvailableQuantity, isQuantityAvailable } from '@/utils/availabilityUtils';
import { isValidBookingDate } from '@/utils/dateUtils';

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const addToCartButtonRef = useRef<HTMLButtonElement>(null);
  
  const locationState = location.state as { 
    startDate?: Date; 
    endDate?: Date; 
    bookingDates?: { startDate?: Date; endDate?: Date }
  } | null;
  
  const [bookingDates, setBookingDates] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({
    startDate: locationState?.bookingDates?.startDate || locationState?.startDate,
    endDate: locationState?.bookingDates?.endDate || locationState?.endDate
  });
  
  const [selectedQuantity, setSelectedQuantity] = useState(1);
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

  // Load categories to get category name by ID
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  const handleBookingChange = (bookingPeriod: BookingPeriod) => {
    const start = isValidBookingDate(bookingPeriod.startDate) ? bookingPeriod.startDate : undefined;
    const end = isValidBookingDate(bookingPeriod.endDate) ? bookingPeriod.endDate : undefined;
    setBookingDates({
      startDate: start,
      endDate: end
    });
    // Reset quantity when dates change
    setSelectedQuantity(1);
  };

  const handleDateConfirmed = () => {
    // Scroll to the Add to Cart button with smooth animation
    if (addToCartButtonRef.current) {
      addToCartButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // Calculate available quantity considering bookings
  const availableQuantity = product ? getAvailableQuantity(
    product, 
    bookings || [], 
    bookingDates?.startDate, 
    bookingDates?.endDate
  ) : 0;

  const isAvailableForDates = product ? isQuantityAvailable(
    product, 
    bookings || [], 
    selectedQuantity, 
    bookingDates?.startDate, 
    bookingDates?.endDate
  ) : false;

  // Check if selected dates conflict with any booking
  const hasDateConflict = bookingDates.startDate && bookingDates.endDate && !isAvailableForDates;

  const handleAddToCart = () => {
    if (!product || !bookingDates.startDate || !bookingDates.endDate || hasDateConflict) return;
    setAddingToCart(true);
    const success = addToCart(product, bookingDates.startDate, bookingDates.endDate, selectedQuantity);
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

  // Find the category name for this product
  const categoryName = categories?.find(cat => cat.category_id === product.category_id)?.name || 'Без категории';

  // Function to display stock status with available quantity
  const renderStockStatus = () => {
    if (isLoadingBookings) {
      return (
        <div className="text-muted-foreground font-medium flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Проверяем наличие...
        </div>
      );
    }

    const hasBookingDates = bookingDates.startDate && bookingDates.endDate;
    const quantityToShow = hasBookingDates ? availableQuantity : product.quantity;
    
    if (quantityToShow > 0) {
      return (
        <div className="text-green-600 dark:text-green-500 font-medium bg-green-50 dark:bg-green-500/10 w-fit px-3 py-1 rounded-md">
          {hasBookingDates ? 'Доступно' : 'В наличии'}: {quantityToShow} шт.
          {hasBookingDates && ' на выбранные даты'}
        </div>
      );
    } else {
      return (
        <div className="text-destructive font-medium bg-destructive/10 w-fit px-3 py-1 rounded-md">
          {hasBookingDates ? 'Забронировано на выбранные даты' : 'Нет в наличии'}
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
                  state={{ activeCategory: product.category_id.toString(), scrollTop: true }}
                >
                  {categoryName}
                </ScrollToTopLink>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <ProductImage imageUrl={product.imageUrl} title={product.title} />

          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">{product.title}</h1>
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">{product.price.toLocaleString()} ₽/сутки</div>
              </div>
              
              {/* Display stock status with updated logic */}
              {renderStockStatus()}
              
              {/* Display full description */}
              {product.description && (
                <div className="prose prose-sm max-w-none pt-2">
                  <p className="text-muted-foreground leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Заказать оборудование</h3>
              
              <BookingCalendar 
                onBookingChange={handleBookingChange} 
                bookedPeriods={bookings || []} 
                initialStartDate={bookingDates.startDate} 
                initialEndDate={bookingDates.endDate} 
                isCompact={isMobile}
                onDateConfirmed={handleDateConfirmed}
              />

              {/* Quantity Selector - only show if dates are selected and quantity > 1 available */}
              {bookingDates.startDate && bookingDates.endDate && availableQuantity > 1 && (
                <div className="space-y-3 bg-secondary/30 p-4 rounded-xl border border-border/50">
                  <label className="text-sm font-medium">Количество:</label>
                  <QuantitySelector
                    quantity={selectedQuantity}
                    onQuantityChange={setSelectedQuantity}
                    maxQuantity={availableQuantity}
                    disabled={isLoadingBookings || hasDateConflict}
                  />
                </div>
              )}

              {bookingDates.startDate && bookingDates.endDate && 
                <PricingCalculator 
                  basePrice={product.price * selectedQuantity} 
                  startDate={bookingDates.startDate} 
                  endDate={bookingDates.endDate} 
                />
              }

              <Button 
                ref={addToCartButtonRef}
                size="lg" 
                className={`w-full text-base h-12 ${hasDateConflict ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                disabled={!product.available || !bookingDates.startDate || !bookingDates.endDate || addingToCart || hasDateConflict}
                onClick={handleAddToCart}
              >
                {addingToCart ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                    В процессе...
                  </>
                ) : hasDateConflict ? (
                  <>
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    Количество недоступно
                  </>
                ) : (
                  <>
                    <CalendarIcon className="mr-2 h-5 w-5" />
                    {bookingDates.startDate && bookingDates.endDate ? 
                      `Добавить в корзину${selectedQuantity > 1 ? ` (${selectedQuantity} шт.)` : ''}` : 
                      'Выберите даты'
                    }
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Секция "Подробности" без использования избыточных табов */}
        <div className="mt-16 pt-12 border-t">
          <h2 className="text-3xl font-bold tracking-tight mb-8">Подробности</h2>
          <ProductTabs 
            product={product}
            bookings={bookings || []}
            onBookingChange={handleBookingChange}
            bookingDates={bookingDates}
          />
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;