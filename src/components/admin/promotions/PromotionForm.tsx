import React, { useState } from 'react';
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
import { AspectRatio } from '@/components/ui/aspect-ratio';

const promotionSchema = z.object({
  title: z.string().min(1, 'Название акции обязательно'),
  linkUrl: z.string().optional(),
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(
    promotion?.imageurl ? promotion.imageurl.startsWith('http') 
      ? promotion.imageurl 
      : `https://api.playbackrental.ru/storage/v1/object/public/products/${promotion.imageurl}` 
      : null
  );
  
  const form = useForm<z.infer<typeof promotionSchema>>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      title: promotion?.title || '',
      linkUrl: promotion?.linkurl || '',
      content: promotion?.content || '',
      active: promotion?.active !== undefined ? promotion.active : true,
    },
  });

  const handleImageChange = (file: File | string) => {
    if (typeof file === 'string') {
      setImagePreviewUrl(file);
      setImageFile(null);
    } else {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (values: z.infer<typeof promotionSchema>) => {
    onSubmit({
      title: values.title,
      imageFile,
      imageUrl: typeof imagePreviewUrl === 'string' ? imagePreviewUrl : undefined,
      linkUrl: values.linkUrl,
      content: values.content,
      active: values.active,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Активна</FormLabel>
                <FormDescription>
                  Акция будет отображаться на сайте, если включена
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название акции (формирует URL)</FormLabel>
              <FormControl>
                <Input placeholder="Например: Весенняя скидка" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Изображение (соотношение 3:4)</FormLabel>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <ImageUploadField
                label="Загрузить изображение"
                onChange={handleImageChange}
                previewUrl={imagePreviewUrl}
              />
              <FormDescription className="mt-2">
                Рекомендуемый размер: 900×1200px. Будет использоваться и в слайдере, и на странице акции.
              </FormDescription>
            </div>
            {imagePreviewUrl && (
              <div className="w-full max-w-xs mx-auto">
                <AspectRatio ratio={3/4} className="bg-muted overflow-hidden rounded-md border">
                  <img src={imagePreviewUrl} alt="Preview" className="object-cover w-full h-full" />
                </AspectRatio>
              </div>
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Текст акции (для создания внутренней страницы)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Опишите подробные условия вашей акции... (переносы строк сохранятся)" 
                  rows={6}
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Если заполнить это поле, будет создана отдельная страница акции.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Сторонняя ссылка / Внешний ресурс</FormLabel>
              <FormControl>
                <Input placeholder="Например: https://partner.com" {...field} />
              </FormControl>
              <FormDescription>
                Заполняйте, только если хотите увести пользователя с сайта или перенаправить на другой раздел без создания отдельной страницы акции.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Сохранение...' : (promotion ? 'Обновить' : 'Добавить')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PromotionForm;