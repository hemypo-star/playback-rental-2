
import Layout from '../components/Layout';
import ContactHero from '../src/components/contact/ContactHero';
import CompanyDescription from '../src/components/contact/CompanyDescription';
import ContactSection from '../src/components/contact/ContactSection';

const Contact = () => {
  return (
    <Layout title="Контакты" description="Свяжитесь с нами для аренды оборудования">
      <div className="min-h-screen">
        <ContactHero />
        <div className="container mx-auto px-4">
          <CompanyDescription />
          <ContactSection />
        </div>
      </div>
    </Layout>
  );
};

export default Contact;
