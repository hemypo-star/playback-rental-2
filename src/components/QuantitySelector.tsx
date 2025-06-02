
import React from 'react';
import { Button } from '@/components/ui/button';
import { MinusIcon, PlusIcon } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity: number;
  minQuantity?: number;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onQuantityChange,
  maxQuantity,
  minQuantity = 1,
  disabled = false,
  size = 'md'
}) => {
  const handleDecrease = () => {
    if (quantity > minQuantity) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(quantity + 1);
    }
  };

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10',
    lg: 'h-12 w-12 text-lg'
  };

  const inputSizeClasses = {
    sm: 'h-8 w-12 text-sm',
    md: 'h-10 w-16',
    lg: 'h-12 w-20 text-lg'
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className={sizeClasses[size]}
        onClick={handleDecrease}
        disabled={disabled || quantity <= minQuantity}
      >
        <MinusIcon className="h-4 w-4" />
      </Button>
      
      <div className={`${inputSizeClasses[size]} flex items-center justify-center border border-gray-300 rounded bg-white font-medium`}>
        {quantity}
      </div>
      
      <Button
        variant="outline"
        size="icon"
        className={sizeClasses[size]}
        onClick={handleIncrease}
        disabled={disabled || quantity >= maxQuantity}
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default QuantitySelector;
