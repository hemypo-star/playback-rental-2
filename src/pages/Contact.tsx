
import ContactHero from "@/components/contact/ContactHero";
import CompanyDescription from "@/components/contact/CompanyDescription";
import ContactSection from "@/components/contact/ContactSection";
import MapSection from "@/components/contact/MapSection";

const Contact = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <ContactHero />

      {/* Company Description Section */}
      <CompanyDescription />

      {/* Contact Information & Form Section */}
      <ContactSection />
      
      {/* Map Section */}
      <MapSection />
    </div>
  );
};

export default Contact;
