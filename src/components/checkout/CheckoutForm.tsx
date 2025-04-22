import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { usePhoneInputMask } from "@/hooks/usePhoneInputMask";

const phoneRegex = /^\+7\d{10}$/;
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let error = "";
    if (name === "name") {
      if (!nameRegex.test(value.trim())) {
        error = "Имя может содержать только буквы";
      }
    }
    if (name === "phone") {
      if (!phoneRegex.test(value.trim())) {
        error = "Телефон должен быть в формате +79999999999";
      }
    }
    if (name === "email") {
      if (!emailRegex.test(value.trim())) {
        error = "Введите корректный email";
      }
    }
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Детали аренды</CardTitle>
        <CardDescription>Заполните информацию о вашем бронировании</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">Имя</label>
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
                onPaste={e => {
                  const paste = e.clipboardData.getData('text');
                  if (!/^[A-Za-zА-Яа-яЁё\s\-]+$/.test(paste)) e.preventDefault();
                }}
                inputMode="text"
              />
              {errors.name && <span className="text-destructive text-sm">{errors.name}</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">E-mail</label>
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
              />
              {errors.email && <span className="text-destructive text-sm">{errors.email}</span>}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone">Телефон</label>
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
              inputMode="tel"
            />
            {errors.phone && <span className="text-destructive text-sm">{errors.phone}</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CheckoutForm;
