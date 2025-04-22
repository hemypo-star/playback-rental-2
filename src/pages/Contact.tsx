import { useState } from "react";
import { MailIcon, MapPinIcon, PhoneIcon, SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const phoneRegex = /^\+7\d{10}$/;
const nameRegex = /^[A-Za-zА-Яа-яЁё\s\-]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Contact = () => {
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<{
    name?: string,
    email?: string,
    phone?: string,
    message?: string
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const nextErrors: { name?: string; email?: string; phone?: string; message?: string } = {};

    if (!formState.name.trim()) {
      nextErrors.name = "Введите имя";
    } else if (!nameRegex.test(formState.name.trim())) {
      nextErrors.name = "Имя может содержать только буквы";
    }
    if (!formState.phone.trim()) {
      nextErrors.phone = "Введите телефон";
    } else if (!phoneRegex.test(formState.phone.trim())) {
      nextErrors.phone = "Телефон должен быть в формате +79999999999";
    }
    if (!formState.email.trim()) {
      nextErrors.email = "Введите email";
    } else if (!emailRegex.test(formState.email.trim())) {
      nextErrors.email = "Введите корректный email";
    }
    if (!formState.message.trim()) {
      nextErrors.message = "Введите сообщение";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    });
    setErrors((prev) => ({
      ...prev,
      [e.target.name]: undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
      setIsSubmitting(false);
      setFormState({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      setErrors({});
    }, 1500);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="heading-1 mb-6">Связаться с нами</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
          У вас есть вопросы по поводу нашей услуги проката оборудования? Свяжитесь с нашей командой.
          </p>
        </div>
      </section>

      {/* Contact Information & Form */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div className="space-y-8">
              <div className="grid gap-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPinIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Наше местоположение</h3>
                    <p className="text-muted-foreground">
                    Г.Кемерово <br />
                    ул. Демьяна Бедного, 6 
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <PhoneIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Телефон</h3>
                    <p className="text-muted-foreground">
                      <a href="tel:+79999999999" className="hover:text-primary transition-colors">
                        +7 (999) 999-99-99
                      </a>
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MailIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">E-mail</h3>
                    <p className="text-muted-foreground">
                      <a href="mailto:PlaybackRental@yandex.ru" className="hover:text-primary transition-colors">
                      PlaybackRental@yandex.ru
                      </a>
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="pt-6">
                <h3 className="font-medium mb-3">График работы</h3>
                <div className="space-y-2 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Будние:</span>
                    <span>9:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Выходные:</span>
                    <span>10:00 - 19:00</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div className="bg-white rounded-xl shadow-soft p-8 subtle-ring">
              <h2 className="heading-3 mb-6">Отправьте нам сообщение</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Имя
                    </label>
                    <Input
                      id="name"
                      name="name"
                      value={formState.name}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-medium">
                      Телефон
                    </label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formState.phone}
                      onChange={handleChange}
                      required
                      autoComplete="off"
                      className={errors.phone ? "border-destructive" : ""}
                      placeholder="+79999999999"
                    />
                    {errors.phone && <p className="text-destructive text-sm">{errors.phone}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleChange}
                    required
                    autoComplete="off"
                    className={errors.email ? "border-destructive" : ""}
                    placeholder="example@email.com"
                  />
                  {errors.email && <p className="text-destructive text-sm">{errors.email}</p>}
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    Сообщение
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    rows={5}
                    value={formState.message}
                    onChange={handleChange}
                    required
                    className={errors.message ? "border-destructive" : ""}
                  />
                  {errors.message && <p className="text-destructive text-sm">{errors.message}</p>}
                </div>
                
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                     Отправка...
                    </>
                  ) : (
                    <>
                      <SendIcon className="h-4 w-4 mr-2" />
                      Отправить
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
      
      {/* Map Section */}
      <section className="py-20 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4">Посетите наш офис</h2>
            <p className="body-text max-w-2xl mx-auto">
            Мы удобно расположены в самом центре города. Приходите в наш выставочный зал, чтобы лично ознакомиться с нашим оборудованием.
            </p>
          </div>
          <div className="max-w-6xl mx-auto h-96 rounded-xl overflow-hidden subtle-ring">
            <div className="w-full h-full bg-white">
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <div className="text-center p-8">
                  <MapPinIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Карта в процессе</h3>
                  <p className="text-muted-foreground max-w-md">
                  Мы работаем над созданием интерактивной карты. А пока
                  вы можете найти нас по адресу Г.Кемерово ул. Демьяна Бедного, 6 
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
