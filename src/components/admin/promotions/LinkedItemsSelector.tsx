import React, { useState } from 'react';
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Item {
  id: string;
  name: string;
}

interface LinkedItemsSelectorProps {
  items: Item[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}

export function LinkedItemsSelector({ items = [], selectedIds = [], onChange, placeholder }: LinkedItemsSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleItem = (id: string) => {
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((i) => i !== id)
      : [...selectedIds, id];
    onChange(newSelection);
  };

  return (
    <div className="space-y-2">
      {/* ВАЖНО: modal={false} отключает блокировку скролла страницы и чинит колесо мыши */}
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between h-auto min-h-10 text-left font-normal"
          >
            <span className="truncate">
              {selectedIds.length > 0 ? `Выбрано: ${selectedIds.length}` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()} 
        >
          {/* pointer-events-auto гарантирует, что мышь всегда взаимодействует с блоком */}
          <Command className="pointer-events-auto">
            <CommandInput placeholder="Поиск по названию..." />
            
            {/* overscroll-contain и stopPropagation изолируют скролл от остального сайта */}
            <CommandList 
              className="max-h-[250px] overflow-y-auto overscroll-contain custom-scrollbar pointer-events-auto"
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <CommandEmpty>Ничего не найдено.</CommandEmpty>
              <CommandGroup>
                {items.length > 0 ? (
                  items.map((item) => (
                    <CommandItem 
                      key={item.id} 
                      value={item.name}
                      onSelect={() => toggleItem(item.id)}
                      className="cursor-pointer"
                    >
                      <div className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        selectedIds.includes(item.id) ? "bg-primary text-primary-foreground" : "opacity-50"
                      )}>
                        {selectedIds.includes(item.id) && <Check className="h-3 w-3" />}
                      </div>
                      {item.name}
                    </CommandItem>
                  ))
                ) : (
                  <div className="p-4 text-sm text-center text-muted-foreground">
                    Нет доступных элементов
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <div className="flex flex-wrap gap-1 mt-2">
        {selectedIds.map(id => {
          const item = items.find(i => i.id === id);
          return item ? (
            <Badge key={id} variant="secondary" className="gap-1 py-1">
              {item.name}
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  toggleItem(id);
                }} 
                className="ml-1 hover:text-destructive outline-none"
              >
                ×
              </button>
            </Badge>
          ) : null;
        })}
      </div>
    </div>
  );
}