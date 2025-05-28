
import { useState } from "react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Category } from "@/types/product";
import { UseFormReturn } from "react-hook-form";

type CategoryFieldProps = {
  form: UseFormReturn<any>;
  categories: Category[];
  showCategoryInput: boolean;
  setShowCategoryInput: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  handleNewCategory: () => Promise<void>;
  isAddingCategory: boolean;
};

export default function CategoryField({
  form,
  categories,
  showCategoryInput,
  setShowCategoryInput,
  newCategoryName,
  setNewCategoryName,
  handleNewCategory,
  isAddingCategory
}: CategoryFieldProps) {
  if (showCategoryInput) {
    return (
      <div className="space-y-2">
        <FormLabel>Новая категория</FormLabel>
        <div className="flex items-center gap-2">
          <Input
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Название категории"
          />
          <Button 
            type="button" 
            onClick={handleNewCategory}
            disabled={isAddingCategory || !newCategoryName.trim()}
          >
            {isAddingCategory ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Добавить'
            )}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setShowCategoryInput(false)}
          >
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  return (
    <FormField
      control={form.control}
      name="category_id"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Категория</FormLabel>
          <div className="flex gap-2 items-end">
            <FormControl className="flex-1">
              <select
                {...field}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="">Выберите категорию</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormControl>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCategoryInput(true)}
            >
              Новая
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
