import { useState, useEffect } from 'react';
import { differenceInHours } from 'date-fns';
import { calculateRentalDetails } from '@/utils/pricingUtils';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AnimatedTransition from './AnimatedTransition';

interface PricingCalculatorProps {
  basePrice: number;
  startDate?: Date;
  endDate?: Date;
  className?: string;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({
  basePrice,
  startDate,
  endDate,
  className,
}) => {
  const [pricing, setPricing] = useState<{
    hours: number;
    days: number;
    total: number;
  }>({
    hours: 0,
    days: 0,
    total: 0,
  });

  useEffect(() => {
    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const hours = differenceInHours(endDate, startDate);
      if (hours <= 0) return;
      
      const days = Math.ceil(hours / 24) || 1;
      const { total } = calculateRentalDetails(basePrice, hours);
      
      setPricing({
        hours,
        days,
        total,
      });
    }
  }, [startDate, endDate, basePrice]);

  if (!startDate || !endDate) {
    return null;
  }

  // Склонение дней
  const getDaysLabel = (days: number) => {
    if (days % 10 === 1 && days % 100 !== 11) return 'день';
    if ([2, 3, 4].includes(days % 10) && ![12, 13, 14].includes(days % 100)) return 'дня';
    return 'дней';
  };

  return (
    <AnimatedTransition show={true} type="slide-up">
      <Card className={className}>
        <div className="p-4 space-y-4">
          <h3 className="font-medium text-lg">Стоимость аренды</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Базовая цена:</span>
              <span>{basePrice.toLocaleString()} ₽/сутки</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Период аренды:</span>
              <span>
                {pricing.hours} ч. ({pricing.days} {getDaysLabel(pricing.days)})
              </span>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <div className="flex justify-between font-medium text-lg pt-2">
              <span>Итого:</span>
              <span>{pricing.total.toLocaleString()} ₽</span>
            </div>
          </div>
        </div>
      </Card>
    </AnimatedTransition>
  );
};

export default PricingCalculator;