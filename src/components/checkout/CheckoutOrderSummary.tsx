import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartContext } from "@/hooks/useCart";
import { calculateRentalDetails, formatCurrency } from "@/utils/pricingUtils";
import { AlertTriangleIcon } from "lucide-react";

interface CheckoutOrderSummaryProps {
  onCheckout: () => void;
  loading: boolean;
}

const CheckoutOrderSummary = ({ onCheckout, loading }: CheckoutOrderSummaryProps) => {
  const { cartItems, getCartTotal } = useCartContext();
  
  const hasMissingDates = cartItems.some(item => !item.startDate || !item.endDate);

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Ваш заказ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasMissingDates ? (
          <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-md text-sm font-medium flex items-start">
            <AlertTriangleIcon className="h-5 w-5 mr-2 shrink-0 mt-0.5" />
            <span>Невозможно рассчитать стоимость. Пожалуйста, выберите даты аренды в блоке выше.</span>
          </div>
        ) : (
          <>
            {cartItems.map((item) => {
              if (!item.startDate || !item.endDate) return null;

              const hours = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60));
              const pricingDetails = calculateRentalDetails(item.price, hours);
              const rowTotal = pricingDetails.total * item.quantity;

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.title}</span>
                    <span>{formatCurrency(rowTotal)}</span>
                  </div>
                  {item.quantity > 1 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.quantity} шт. × {formatCurrency(pricingDetails.total)}
                    </div>
                  )}
                </div>
              );
            })}

            <Separator />

            <div className="flex justify-between text-lg font-semibold">
              <span>Итого:</span>
              <span>{formatCurrency(getCartTotal())}</span>
            </div>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          size="lg" 
          onClick={onCheckout} 
          disabled={loading || cartItems.length === 0 || hasMissingDates}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              Отправка...
            </>
          ) : (
            'Подтвердить бронирование'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CheckoutOrderSummary;