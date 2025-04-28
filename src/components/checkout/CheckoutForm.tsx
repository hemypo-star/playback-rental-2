import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { usePhoneInputMask } from "@/hooks/usePhoneInputMask";
import { isPhoneComplete, getPhoneRequirements } from "@/utils/phoneMask";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangleIcon } from 'lucide-react';

const nameRegex = /^[A-Za-zА-Яа-яЁё\s\-]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CheckoutFormProps {
  formData: { name: string; email: string; phone: string };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CheckoutForm = ({ formData, onInputChange }: CheckoutFormProps) => {
  const { handlePhoneChange, handlePhonePaste } = usePhoneInputMask((val) => {
    const syntheticEvent = {
      target: {
        name: "phone",
        value: val,
      },
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(syntheticEvent);
  });

  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  
  useEffect(() => {
    validateField('name', formData.name);
    validateField('email', formData.email);
    validateField('phone', formData.phone);
    
    if (formData.name && formData.email && isPhoneComplete(formData.phone) &&
        nameRegex.test(formData.name) && emailRegex.test(formData.email)) {
      setShowValidationAlert(false);
    }
  }, [formData]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isValid = validateAllFields();
      if (!isValid) {
        setShowValidationAlert(true);
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') && target.closest('button')?.textContent?.includes('Оформить заказ')) {
        const isValid = validateAllFields();
        if (!isValid) {
          setShowValidationAlert(true);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [formData]);

  const validateAllFields = (): boolean => {
    const nameValid = validateField('name', formData.name);
    const emailValid = validateField('email', formData.email);
    const phoneValid = validateField('phone', formData.phone);
    
    return nameValid && emailValid && phoneValid;
  };

  const validateField = (name: string, value: string): boolean => {
    let error = "";
    let isValid = true;
    
    if (!value.trim()) {
      error = "Поле обязательно для заполнения";
      isValid = false;
    } else if (name === "name") {
      if (!nameRegex.test(value.trim())) {
        error = "Имя может содержать только буквы, пробелы и дефисы";
        isValid = false;
      }
    } else if (name === "email") {
      if (!emailRegex.test(value.trim())) {
        error = "Введите корректный email";
        isValid = false;
      }
    } else if (name === "phone") {
      if (!isPhoneComplete(value)) {
        error = getPhoneRequirements();
        isValid = false;
      }
    }
    
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
    
    return isValid;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Детали аренды</CardTitle>
        <CardDescription>Заполните информацию о вашем бронировании</CardDescription>
      </CardHeader>
      <CardContent>
        {showValidationAlert && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              Пожалуйста, заполните все обязательные поля корректно перед оформлением заказа
            </AlertDescription>
          </Alert>
        )}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Имя <span className="text-destructive">*</span>
              </label>
              <Input 
                id="name"
                name="name"
                value={formData.name}
                onChange={onInputChange}
                placeholder="Иван Иванов"
                onBlur={handleBlur}
                className={errors.name ? "border-destructive" : ""}
                autoComplete="off"
                pattern="[A-Za-zА-Яа-яЁё\s\-]+"
                required
              />
              {errors.name && <span className="text-destructive text-sm">{errors.name}</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                E-mail <span className="text-destructive">*</span>
              </label>
              <Input 
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={onInputChange}
                placeholder="email@example.com"
                onBlur={handleBlur}
                className={errors.email ? "border-destructive" : ""}
                autoComplete="off"
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                required
              />
              {errors.email && <span className="text-destructive text-sm">{errors.email}</span>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone">
              Телефон <span className="text-destructive">*</span>
            </label>
            <Input 
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              onPaste={handlePhonePaste}
              placeholder="+7 (___) ___-__-__"
              onBlur={handleBlur}
              className={errors.phone ? "border-destructive" : ""}
              autoComplete="off"
              maxLength={18}
              required
            />
            {errors.phone && <span className="text-destructive text-sm">{errors.phone}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckoutForm;
