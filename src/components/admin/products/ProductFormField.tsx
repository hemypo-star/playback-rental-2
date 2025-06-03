
import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from '@/hooks/useProductForm';

type ProductFormFieldProps = {
  form: UseFormReturn<ProductFormValues>;
  name: keyof ProductFormValues;
  label: string;
  children: React.ReactNode;
  description?: React.ReactNode;
};

export default function ProductFormField({
  form,
  name,
  label,
  children,
  description
}: ProductFormFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={name === 'available' ? "flex flex-row items-center justify-between rounded-lg border p-4" : ""}>
          {name === 'available' ? (
            <>
              <div className="space-y-0.5">
                <FormLabel className="text-base">{label}</FormLabel>
                {description && <div className="text-sm text-muted-foreground">{description}</div>}
              </div>
              <FormControl>
                {React.cloneElement(children as React.ReactElement, { 
                  checked: field.value,
                  onCheckedChange: (checked: boolean) => {
                    console.log('Switch toggled:', checked);
                    field.onChange(checked);
                  }
                })}
              </FormControl>
            </>
          ) : (
            <>
              <FormLabel>{label}</FormLabel>
              <FormControl>{React.cloneElement(children as React.ReactElement, { ...field })}</FormControl>
              {description && <div className="text-sm text-muted-foreground">{description}</div>}
              <FormMessage />
            </>
          )}
        </FormItem>
      )}
    />
  );
}
