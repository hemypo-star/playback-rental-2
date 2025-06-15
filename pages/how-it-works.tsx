
import Head from 'next/head';
import dynamic from 'next/dynamic';

const HowItWorksSection = dynamic(() => import('../src/components/home/HowItWorksSection'), { ssr: true });

export default function HowItWorks() {
  return (
    <>
      <Head>
        <title>How It Works - Equipment Rental</title>
        <meta name="description" content="Learn how our equipment rental process works. Simple steps to rent professional equipment." />
      </Head>
      
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold text-center mb-8">How It Works</h1>
          <HowItWorksSection />
        </div>
      </div>
    </>
  );
}
