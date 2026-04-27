import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Promotion, PromotionFormValues } from '@/types/promotion';
import ImageUploadField from '@/components/ImageUploadField';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { LinkedItemsSelector } from './LinkedItemsSelector';
import { useQuery } from '@tanstack/react-query';
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';

const promotionSchema = z.object({
  title: z.string().min(1, 'Название акции обязательно'),
  linkUrl: z.string().optional(), // Поле для ссылки кнопки
  content: z.string().optional(),
  active: z.boolean().default(true),
});

type PromotionFormProps = {
  promotion?: Promotion;
  onSubmit: (data: PromotionFormValues) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

const PromotionForm = ({ promotion, onSubmit, onCancel, isSubmitting }: PromotionFormProps) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(promotion?.imageurl || null);
  
  const { data: allProducts, isLoading: isLoadingProducts } = useQuery({ 
    queryKey: ['products'], 
    queryFn: getProducts,
    staleTime: 1000 * 60 * 5 
  });
  
  const { data: allCategories, isLoading: isLoadingCategories } = useQuery({ 
    queryKey: ['categories'], 
    queryFn: getCategories,
    staleTime: 1000 * 60 * 5
  });

  const [linkType, setLinkType] = useState<'none' | 'products' | 'categories'>(
    promotion?.linked_products?.length ? 'products' : 
    promotion?.linked_categories?.length ? 'categories' : 'none'
  );
  
  const [selectedProducts, setSelectedProducts] = useState<string[]>(promotion?.linked_products || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(promotion?.linked_categories || []);

  const productItems = useMemo(() => 
    allProducts?.map((p: any) => ({ id: p.id, name: p.title || p.name || 'Без названия' })) || []
  , [allProducts]);

  const categoryItems = useMemo(() => 
    allCategories?.map((c: any) => ({ id: c.id, name: c.name || c.title || 'Без названия' })) || []
  , [allCategories]);

  const form = useForm<z.infer<typeof promotionSchema>>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      title: promotion?.title || '',
      linkUrl: promotion?.linkurl || '',
      content: promotion?.content || '',
      active: promotion?.active ?? true,
    },
  });

  const handleSubmit = (values: z.infer<typeof promotionSchema>) => {
    onSubmit({
      ...values,
      imageFile,
      imageUrl: imagePreviewUrl || undefined,
      linked_products: linkType === 'products' ? selectedProducts : [],
      linked_categories: linkType === 'categories' ? selectedCategories : [],
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Переключатель активности */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <FormLabel className="text-base font-semibold">Активна</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Заголовок */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название акции (формирует URL)</FormLabel>
              <FormControl>
                <Input placeholder="Весенняя распродажа" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Загрузка фото */}
        <ImageUploadField 
          label="Изображение акции (соотношение 3:4)" 
          onChange={(file) => typeof file === 'string' ? setImagePreviewUrl(file) : setImageFile(file)} 
          previewUrl={imagePreviewUrl} 
        />

        {/* Текст акции */}
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Текст на странице акции</FormLabel>
              <FormControl>
                <Textarea placeholder="Опишите условия..." rows={5} {...field} />
              </FormControl>
              <FormDescription>Этот текст будет отображаться в правой колонке на странице акции.</FormDescription>
            </FormItem>
          )}
        />

        {/* ВОТ ВЕРНУВШЕЕСЯ ПОЛЕ: Ссылка для кнопки */}
        <FormField
          control={form.control}
          name="linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ссылка для кнопки (External Link)</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              <FormDescription>
                Если заполнено, на странице появится кнопка «Перейти» с этой ссылкой.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Привязка к каталогу */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <Label className="text-base font-semibold">Товары или Категории в акции</Label>
          <Tabs value={linkType} onValueChange={(v: any) => setLinkType(v)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="none">Без товаров</TabsTrigger>
              <TabsTrigger value="products">Товары</TabsTrigger>
              <TabsTrigger value="categories">Категории</TabsTrigger>
            </TabsList>
          </Tabs>

          {linkType === 'products' && (
            <LinkedItemsSelector 
              items={productItems}
              selectedIds={selectedProducts}
              onChange={setSelectedProducts}
              placeholder={isLoadingProducts ? "Загрузка товаров..." : "Выберите товары..."}
            />
          )}

          {linkType === 'categories' && (
            <LinkedItemsSelector 
              items={categoryItems}
              selectedIds={selectedCategories}
              onChange={setSelectedCategories}
              placeholder={isLoadingCategories ? "Загрузка категорий..." : "Выберите категории..."}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : (promotion ? 'Обновить' : 'Добавить')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PromotionForm;