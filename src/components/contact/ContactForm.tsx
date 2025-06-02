import { useState } from "react";
import { Send, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { usePhoneInputMask } from "@/hooks/usePhoneInputMask";
import { sendContactNotification } from "@/services/telegramService";
import { isPhoneComplete } from "@/utils/phoneMask";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [notificationStatus, setNotificationStatus] = useState<{
    status: 'idle' | 'sending' | 'partial' | 'success' | 'failed';
    message?: string;
    details?: string;
  }>({ status: 'idle' });
  
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
    } else if (!isPhoneComplete(formState.phone)) {
      nextErrors.phone = "Телефон должен содержать 10 цифр в формате +7 (XXX) XXX-XX-XX";
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setNotificationStatus({ status: 'sending', message: 'Отправляем уведомление...' });
    
    try {
      // Send Telegram notification with enhanced feedback
      const result = await sendContactNotification({
        name: formState.name,
        email: formState.email,
        phone: formState.phone,
        subject: formState.subject,
        message: formState.message
      });

      if (result.success) {
        setNotificationStatus({ 
          status: 'success', 
          message: `Уведомление отправлено успешно (${result.successfulChats}/${result.attemptedChats} получателей)` 
        });
        
        toast({
          title: "Сообщение отправлено!",
          description: "Мы свяжемся с вами в ближайшее время."
        });
        
        // Clear form after successful submission
        setFormState({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: ""
        });
        setErrors({});
      } else {
        const isPartialSuccess = result.successfulChats > 0;
        setNotificationStatus({ 
          status: isPartialSuccess ? 'partial' : 'failed',
          message: result.message,
          details: `Успешно: ${result.successfulChats}/${result.attemptedChats} получателей`
        });
        
        if (isPartialSuccess) {
          toast({
            title: "Сообщение частично отправлено",
            description: "Некоторые уведомления не были доставлены, но ваше сообщение получено.",
            variant: "default"
          });
        } else {
          toast({
            title: "Ошибка отправки уведомлений",
            description: "Ваше сообщение сохранено, но уведомления не были доставлены.",
            variant: "destructive"
          });
        }
      }

      // Simulate form submission (replace with actual form handling if needed)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setNotificationStatus({ 
        status: 'failed', 
        message: 'Ошибка при отправке',
        details: error instanceof Error ? error.message : 'Неизвестная ошибка'
      });
      
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение. Попробуйте еще раз.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      // Clear status after 5 seconds
      setTimeout(() => {
        setNotificationStatus({ status: 'idle' });
      }, 5000);
    }
  };

  const getStatusIcon = () => {
    switch (notificationStatus.status) {
      case 'sending': return <Clock className="h-4 w-4 animate-spin" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  const getStatusVariant = () => {
    switch (notificationStatus.status) {
      case 'success': return 'default';
      case 'partial': return 'default';
      case 'failed': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-soft p-8 subtle-ring">
      <h2 className="heading-3 mb-6">Отправьте нам сообщение</h2>
      
      {notificationStatus.status !== 'idle' && (
        <Alert variant={getStatusVariant()} className="mb-6">
          {getStatusIcon()}
          <AlertDescription>
            <div className="font-medium">{notificationStatus.message}</div>
            {notificationStatus.details && (
              <div className="text-sm mt-1 opacity-90">{notificationStatus.details}</div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
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
          <label htmlFor="subject" className="text-sm font-medium">
            Тема (необязательно)
          </label>
          <Input 
            id="subject" 
            name="subject" 
            value={formState.subject} 
            onChange={handleChange} 
            autoComplete="off" 
          />
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
