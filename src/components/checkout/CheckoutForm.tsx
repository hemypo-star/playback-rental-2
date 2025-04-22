
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface CheckoutFormProps {
  formData: { name: string; email: string; phone: string };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const CheckoutForm = ({ formData, onInputChange }: CheckoutFormProps) => (
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
            />
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
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="phone">Телефон</label>
          <Input 
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={onInputChange}
            placeholder="+7 (XXX) XXX-XX-XX"
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default CheckoutForm;
