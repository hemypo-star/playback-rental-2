
import Head from 'next/head';
import dynamic from 'next/dynamic';

const ContactHero = dynamic(() => import('../src/components/contact/ContactHero'), { ssr: true });
const CompanyDescription = dynamic(() => import('../src/components/contact/CompanyDescription'), { ssr: true });
const ContactSection = dynamic(() => import('../src/components/contact/ContactSection'), { ssr: true });

export default function Contact() {
  return (
    <>
      <Head>
        <title>Contact Us - Equipment Rental</title>
        <meta name="description" content="Get in touch with our equipment rental team. Contact information and inquiry form." />
      </Head>
      
      <div className="min-h-screen">
        <ContactHero />
        <div className="container mx-auto px-4">
          <CompanyDescription />
          <ContactSection />
        </div>
      </div>
    </>
  );
}
