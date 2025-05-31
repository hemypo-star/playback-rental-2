
import { ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CheckoutSuccess = () => (
  <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[70vh]">
    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
      <ShieldCheckIcon className="h-10 w-10 text-green-600" />
    </div>
    <h1 className="heading-2 mb-4 text-center">Бронирование подтверждено!</h1>
    <p className="text-xl text-center text-muted-foreground mb-8 max-w-md">
      Ваш прокат оборудования подтвержден. Наш менеджер свяжется с вами в ближайшее время!
    </p>
    <div className="flex flex-col sm:flex-row gap-4">
      <Button asChild size="lg">
        <Link to="/catalog">Вернуться к каталогу</Link>
      </Button>
    </div>
  </div>
);

export default CheckoutSuccess;
