
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const CheckoutForm = dynamic(() => import('../src/components/checkout/CheckoutForm'), { ssr: false });
const CartList = dynamic(() => import('../src/components/checkout/CartList'), { ssr: false });
const CheckoutOrderSummary = dynamic(() => import('../src/components/checkout/CheckoutOrderSummary'), { ssr: false });
const CheckoutSuccess = dynamic(() => import('../src/components/checkout/CheckoutSuccess'), { ssr: false });

export default function Checkout() {
  const router = useRouter();
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (router.query.success === 'true') {
      setIsSuccess(true);
    }
  }, [router.query]);

  if (isSuccess) {
    return (
      <>
        <Head>
          <title>Order Success - Equipment Rental</title>
        </Head>
        <CheckoutSuccess />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout - Equipment Rental</title>
        <meta name="description" content="Complete your equipment rental order" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <CartList />
            <CheckoutForm />
          </div>
          <div>
            <CheckoutOrderSummary />
          </div>
        </div>
      </div>
    </>
  );
}
