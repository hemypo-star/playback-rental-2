
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCartContext } from "@/hooks/useCart";
import { calculateRentalDetails, formatCurrency } from "@/utils/pricingUtils";

interface CheckoutOrderSummaryProps {
  onCheckout: () => void;
  loading: boolean;
}

const CheckoutOrderSummary = ({ onCheckout, loading }: CheckoutOrderSummaryProps) => {
  const { cartItems, getCartTotal } = useCartContext();

  return (
    <Card className="sticky top-20">
      <CardHeader>
        <CardTitle>Ваш заказ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {cartItems.map((item) => {
          const hours = Math.ceil((item.endDate.getTime() - item.startDate.getTime()) / (1000 * 60 * 60));
          const pricingDetails = calculateRentalDetails(item.price, hours);

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.title}</span>
                <span>{formatCurrency(pricingDetails.total)}</span>
              </div>
              {pricingDetails.dayDiscount > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Скидка:</span>
                  <span>-{pricingDetails.dayDiscount}%</span>
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
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" onClick={onCheckout} disabled={loading || cartItems.length === 0}>
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
