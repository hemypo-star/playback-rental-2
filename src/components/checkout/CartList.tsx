
import { CalendarIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useCartContext } from "@/hooks/useCart";
import { calculateRentalDetails, formatCurrency } from "@/utils/pricingUtils";
import { formatDateRange } from "@/utils/dateUtils";
import OptimizedImage from '@/components/OptimizedImage';

const CartList = () => {
  const { cartItems, removeFromCart } = useCartContext();

  if (cartItems.length === 0) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Ваша корзина</CardTitle>
          <CardDescription>Проверьте ваш заказ перед оформлением</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-muted-foreground mb-4" width="2em" height="2em" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a6 6 0 0 0-6 6v2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V8a6 6 0 0 0-6-6zM6 8a6 6 0 0 1 12 0v2H6V8zm14 10H4v-8h16v8zm-2 2H6v-2h12v2zm2-2V8V6a8 8 0 1 0-16 0v2H2a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h16a4 4 0 0 0 4-4z" /></svg>
            <h3 className="text-xl font-medium mb-2">Ваша корзина пуста</h3>
            <p className="text-muted-foreground mb-6">
              Похоже, вы еще не добавили какое-либо оборудование в свою корзину.
            </p>
            <Button asChild>
              <a href="/catalog">Просмотр каталога</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Ваша корзина</CardTitle>
        <CardDescription>Проверьте ваш заказ перед оформлением</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {cartItems.map((item, index) => {
            const hours = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60));
            const pricingDetails = calculateRentalDetails(item.price, hours);
            const itemTotal = pricingDetails.total;

            return (
              <div key={item.id} className="flex gap-4">
                <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 subtle-ring">
                  <OptimizedImage 
                    src={item.imageUrl} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                    width={96}
                    height={96}
                    priority={index < 3}
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    <CalendarIcon className="inline-block h-3 w-3 mr-1" />
                    {formatDateRange(item.startDate, item.endDate, true)}
                  </p>
                  {pricingDetails.dayDiscount > 0 && (
                    <p className="text-xs text-green-600 mb-1">Скидка: {pricingDetails.dayDiscount}%</p>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      {pricingDetails.discount > 0 ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm line-through text-muted-foreground">{formatCurrency(pricingDetails.subtotal)}</p>
                          <p className="font-medium">{formatCurrency(itemTotal)}</p>
                        </div>
                      ) : (
                        <p className="font-medium">{formatCurrency(itemTotal)}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default CartList;
