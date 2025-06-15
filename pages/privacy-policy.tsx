
import Head from 'next/head';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Equipment Rental</title>
        <meta name="description" content="Our privacy policy and how we handle your personal information." />
      </Head>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto prose prose-lg">
          <h1>Privacy Policy</h1>
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2>Information We Collect</h2>
          <p>We collect information you provide directly to us when you use our equipment rental services.</p>
          
          <h2>How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services.</p>
          
          <h2>Information Sharing</h2>
          <p>We do not sell, trade, or otherwise transfer your personal information to third parties.</p>
          
          <h2>Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us.</p>
        </div>
      </div>
    </>
  );
}
