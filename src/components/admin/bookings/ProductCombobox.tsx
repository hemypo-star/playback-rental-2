
import React, { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Product {
  id: string;
  title: string;
  price: number;
}

interface ProductComboboxProps {
  products: Product[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ProductCombobox: React.FC<ProductComboboxProps> = ({
  products,
  value,
  onValueChange,
  placeholder = "Поиск продукта...",
  disabled = false
}) => {
  const [open, setOpen] = useState(false);

  const selectedProduct = products?.find(product => product.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedProduct ? (
            <div className="flex justify-between items-center w-full">
              <span>{selectedProduct.title}</span>
              <span className="text-muted-foreground ml-2">
                {selectedProduct.price.toLocaleString()} ₽
              </span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Поиск продукта..." />
          <CommandList>
            <CommandEmpty>Продукт не найден.</CommandEmpty>
            <CommandGroup>
              {products?.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.title}
                  onSelect={() => {
                    onValueChange(product.id === value ? "" : product.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex justify-between items-center w-full">
                    <span>{product.title}</span>
                    <span className="text-muted-foreground ml-2">
                      {product.price.toLocaleString()} ₽
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
