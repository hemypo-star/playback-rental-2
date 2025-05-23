
import ContactHero from "@/components/contact/ContactHero";
import CompanyDescription from "@/components/contact/CompanyDescription";
import ContactSection from "@/components/contact/ContactSection";

const Contact = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <ContactHero />

      <div className="container mx-auto px-4">
        {/* Company Description Section */}
        <CompanyDescription />

        {/* Contact Information & Form Section */}
        <ContactSection />
      </div>
    </div>
  );
};

export default Contact;
