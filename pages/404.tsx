
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Custom404() {
  return (
    <>
      <Head>
        <title>Page Not Found - Equipment Rental</title>
        <meta name="description" content="The page you are looking for does not exist." />
      </Head>

      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <div className="space-y-4">
            <Button asChild size="lg">
              <Link href="/catalog">Browse Equipment</Link>
            </Button>
            <br />
            <Button asChild variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
