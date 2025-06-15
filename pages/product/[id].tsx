
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProductById } from '@/services/productService';
import ProductHeader from '@/components/product/ProductHeader';
import ProductImage from '@/components/product/ProductImage';
import ProductTabs from '@/components/product/ProductTabs';
import RentalFeatures from '@/components/product/RentalFeatures';
import BookingCalendar from '@/components/BookingCalendar';
import PricingCalculator from '@/components/PricingCalculator';
import { Product } from '@/types/product';

interface ProductPageProps {
  productId: string;
}

export default function ProductPage({ productId }: ProductPageProps) {
  const router = useRouter();
  const [bookingDates, setBookingDates] = useState<{startDate?: Date, endDate?: Date}>({});

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProductById(productId),
    enabled: !!productId,
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (error || !product) {
    return <div className="container mx-auto px-4 py-8">Product not found</div>;
  }

  const handleBookingChange = (booking: any) => {
    setBookingDates({ startDate: booking.startDate, endDate: booking.endDate });
  };

  return (
    <>
      <Head>
        <title>{product.title} - Equipment Rental</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description} />
        <meta property="og:image" content={product.imageUrl} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <ProductImage product={product} />
          <div className="space-y-6">
            <ProductHeader product={product} />
            <PricingCalculator 
              product={product}
              bookingDates={bookingDates}
            />
            <BookingCalendar
              onBookingChange={handleBookingChange}
              initialStartDate={bookingDates.startDate}
              initialEndDate={bookingDates.endDate}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ProductTabs product={product} />
          </div>
          <div>
            <RentalFeatures />
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const productId = params?.id as string;

  if (!productId) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      productId,
    },
  };
};
