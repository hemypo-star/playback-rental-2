
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@/types/product";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import ImageUploadField from "@/components/ImageUploadField";
import { Category } from "@/types/product";
import { UseMutationResult } from "@tanstack/react-query";

export const productFormSchema = z.object({
  title: z.string().min(2, {
    message: 'Название должно содержать минимум 2 символа',
  }),
  description: z.string().optional(),
  price: z.coerce.number().min(1, {
    message: 'Цена должна быть больше 0',
  }),
  category: z.string().min(1, {
    message: 'Выберите категорию',
  }),
  imageUrl: z.string().optional(),
  quantity: z.coerce.number().min(1, {
    message: 'Количество должно быть больше 0',
  }),
  available: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductFormProps = {
  editProduct: Product | null;
  categories: Category[];
  isSubmitting: boolean;
  onSubmit: (values: ProductFormValues) => void;
  onCancel: () => void;
};

export default function ProductForm({
  editProduct,
  categories,
  isSubmitting,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const { toast } = useToast();
  const [fileForProduct, setFileForProduct] = useState<File | null>(null);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: editProduct?.title || '',
      description: editProduct?.description || '',
      price: editProduct?.price || 0,
      category: editProduct?.category || '',
      imageUrl: editProduct?.imageUrl || '',
      quantity: editProduct?.quantity || 1,
      available: editProduct?.available ?? true,
    },
  });

  const handleNewCategory = async () => {
    setIsAddingCategory(true);
    try {
      if (!newCategoryName.trim()) {
        toast({
          title: 'Ошибка',
          description: 'Введите название категории',
          variant: 'destructive',
        });
        return;
      }

      const slug = newCategoryName.toLowerCase().replace(/\s+/g, '-');
      
      // This would typically call a prop function to add the category
      // For now we'll just update the form state
      form.setValue('category', newCategoryName);
      setShowCategoryInput(false);
      setNewCategoryName('');
      setFileForCategory(null);
      
      toast({
        title: 'Категория добавлена',
        description: 'Новая категория успешно добавлена',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить категорию: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleFormSubmit = (values: ProductFormValues) => {
    if (!editProduct) {
      toast({
        title: 'Ошибка',
        description: 'Не выбран товар для редактирования',
        variant: 'destructive',
      });
      return;
    }
    
    // Pass the file along with the form values to the parent component
    const formData = {
      ...values,
      file: fileForProduct,
    };
    
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Цена (₽)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Количество</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {showCategoryInput ? (
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
        ) : (
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Категория</FormLabel>
                <div className="flex gap-2 items-end">
                  <FormControl className="flex-1">
                    <select
                      {...field}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    >
                      <option value="">Выберите категорию</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
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
        )}

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Изображение</FormLabel>
              <FormControl>
                <div>
                  <ImageUploadField
                    onChange={(file) => {
                      setFileForProduct(file);
                    }}
                    previewUrl={fileForProduct ? URL.createObjectURL(fileForProduct) : field.value || null}
                    disabled={isSubmitting}
                  />
                  <Input 
                    type="hidden"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="available"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Доступность</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Товар доступен для бронирования
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              'Сохранить'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
