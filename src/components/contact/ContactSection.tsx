
import ContactDetails from "./ContactDetails";
import ContactForm from "./ContactForm";

const ContactSection = () => {
  return (
    <section className="py-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Information */}
        <ContactDetails />
        
        {/* Contact Form */}
        <ContactForm />
      </div>
    </section>
  );
};

export default ContactSection;
