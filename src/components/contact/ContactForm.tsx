
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { usePhoneInputMask } from "@/hooks/usePhoneInputMask";

const phoneRegex = /^\+7\d{10}$/;
const nameRegex = /^[A-Za-zА-Яа-яЁё\s\-]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ContactForm = () => {
  const { toast } = useToast();
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: ""
  });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { handlePhoneChange, handlePhonePaste } = usePhoneInputMask(maskedValue => {
    setFormState(prev => ({
      ...prev,
      phone: maskedValue
    }));
    setErrors(prev => ({
      ...prev,
      phone: undefined
    }));
  });
  
  const validateForm = () => {
    const nextErrors: {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    } = {};
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
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.name === "phone") return;
    setFormState({
      ...formState,
      [e.target.name]: e.target.value
    });
    setErrors(prev => ({
      ...prev,
      [e.target.name]: undefined
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
        description: "We'll get back to you as soon as possible."
      });
      setIsSubmitting(false);
      setFormState({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
      });
      setErrors({});
    }, 1500);
  };

  return (
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
              pattern="[A-Za-zА-Яа-яЁё\s\-]+" 
              onPaste={e => {
                const paste = e.clipboardData.getData('text');
                if (!/^[A-Za-zА-Яа-яЁё\s\-]+$/.test(paste)) e.preventDefault();
              }} 
              inputMode="text" 
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
              onChange={handlePhoneChange} 
              onPaste={handlePhonePaste} 
              required 
              autoComplete="off" 
              className={errors.phone ? "border-destructive" : ""} 
              placeholder="+7 (___) ___-__-__" 
              maxLength={18} 
              inputMode="tel" 
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
              <Send className="h-4 w-4 mr-2" />
              Отправить
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default ContactForm;
