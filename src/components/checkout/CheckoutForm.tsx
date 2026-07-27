import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox"; // Добавляем импорт Checkbox
import { useState, useEffect } from "react";
import { usePhoneInputMask } from "@/hooks/usePhoneInputMask";
import { isPhoneComplete, getPhoneRequirements } from "@/utils/phoneMask";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangleIcon } from 'lucide-react';
import { Link } from "react-router-dom"; // Для безопасного роутинга на страницу политики

const nameRegex = /^[A-Za-zА-Яа-яЁё\s\-]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CheckoutFormProps {
  formData: { name: string; email: string; phone: string };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
}

const CheckoutForm = ({ formData, onInputChange, onSubmit }: CheckoutFormProps) => {
  const { handlePhoneChange, handlePhonePaste } = usePhoneInputMask((val) => {
    const syntheticEvent = {
      target: { name: "phone", value: val },
    } as React.ChangeEvent<HTMLInputElement>;
    onInputChange(syntheticEvent);
  });

  // Добавляем policy в интерфейс ошибок
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string; policy?: string }>({});
  const [showValidationAlert, setShowValidationAlert] = useState(false);
  const [formSubmitAttempted, setFormSubmitAttempted] = useState(false);
  
  // Локальное состояние для галочки
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  
  useEffect(() => {
    if (formSubmitAttempted) {
      validateField('name', formData.name);
      validateField('email', formData.email);
      validateField('phone', formData.phone);
    }
    
    if (formSubmitAttempted && formData.name && formData.email && isPhoneComplete(formData.phone) &&
        nameRegex.test(formData.name) && emailRegex.test(formData.email) && agreedToPolicy) {
      setShowValidationAlert(false);
    }
  }, [formData, formSubmitAttempted, agreedToPolicy]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitAttempted(true);
    
    const isValid = validateAllFields();
    if (!isValid) {
      setShowValidationAlert(true);
      return;
    }
    
    onSubmit();
  };

  const validateAllFields = (): boolean => {
    const nameValid = validateField('name', formData.name);
    const emailValid = validateField('email', formData.email);
    const phoneValid = validateField('phone', formData.phone);
    const policyValid = agreedToPolicy;

    if (!policyValid) {
      setErrors((prev) => ({ ...prev, policy: "Необходимо согласие на обработку данных" }));
    } else {
      setErrors((prev) => ({ ...prev, policy: "" }));
    }
    
    return nameValid && emailValid && phoneValid && policyValid;
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
    
    setErrors((prev) => ({ ...prev, [name]: error }));
    return isValid;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (formSubmitAttempted) {
      validateField(name, value);
    }
  };

  return (
    <form id="checkout-form" onSubmit={handleFormSubmit}>
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
                  className={formSubmitAttempted && errors.name ? "border-destructive" : ""}
                  autoComplete="off"
                  pattern="[A-Za-zА-Яа-яЁё\s\-]+"
                  required
                />
                {formSubmitAttempted && errors.name && <span className="text-destructive text-sm">{errors.name}</span>}
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
                  className={formSubmitAttempted && errors.email ? "border-destructive" : ""}
                  autoComplete="off"
                  pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                  required
                />
                {formSubmitAttempted && errors.email && <span className="text-destructive text-sm">{errors.email}</span>}
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
                className={formSubmitAttempted && errors.phone ? "border-destructive" : ""}
                autoComplete="off"
                maxLength={18}
                required
              />
              {formSubmitAttempted && errors.phone && <span className="text-destructive text-sm">{errors.phone}</span>}
            </div>

            {/* Блок с галочкой согласия */}
            <div className="space-y-2 pt-4 border-t">
              <div className="flex flex-row items-start space-x-3 space-y-0">
                <Checkbox 
                  id="policy" 
                  checked={agreedToPolicy}
                  onCheckedChange={(checked) => {
                    setAgreedToPolicy(checked as boolean);
                    if (checked) setErrors((prev) => ({ ...prev, policy: "" }));
                  }}
                />
                <div className="space-y-1 leading-none">
                  <label htmlFor="policy" className="text-sm font-medium cursor-pointer">
                    Я согласен с{" "}
                    <Link to="/privacy-policy" target="_blank" className="text-primary hover:underline">
                      политикой обработки персональных данных
                    </Link>
                    <span className="text-destructive ml-1">*</span>
                  </label>
                </div>
              </div>
              {formSubmitAttempted && errors.policy && (
                <span className="text-destructive text-sm block">{errors.policy}</span>
              )}
            </div>

          </div>
        </CardContent>
      </Card>
    </form>
  );
};

export default CheckoutForm;