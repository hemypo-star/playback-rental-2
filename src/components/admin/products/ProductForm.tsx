
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
import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import ImageUploadField from "@/components/ImageUploadField";
import { Category } from "@/types/product";
import { resetStoragePermissions, testStorageConnection } from "@/services/storageService";
import { verifyStorageAccess } from "@/utils/imageUtils";
import { AlertVariant, AlertTitle, AlertDescription } from "@/components/ui/alert-variant";

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
  onSubmit: (values: ProductFormValues, imageFile: File | string | null) => void;
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
  const [imageForProduct, setImageForProduct] = useState<File | string | null>(null);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [storageStatus, setStorageStatus] = useState<{
    initialized: boolean;
    error: string | null;
    products: boolean;
    categories: boolean;
  }>({
    initialized: false,
    error: null,
    products: false,
    categories: false
  });
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);

  // Initialize storage buckets when the form loads
  useEffect(() => {
    const initStorage = async () => {
      try {
        setIsCheckingStorage(true);
        console.log("Initializing storage buckets...");
        
        // First reset/ensure buckets
        const reset = await resetStoragePermissions();
        console.log("Storage reset result:", reset);
        
        if (!reset) {
          setStorageStatus({
            initialized: false,
            error: "Не удалось инициализировать хранилище для изображений",
            products: false,
            categories: false
          });
          
          toast({
            title: "Предупреждение",
            description: "Не удалось инициализировать хранилище для изображений",
            variant: "destructive"
          });
          return;
        }
        
        // Then verify access
        const access = await verifyStorageAccess();
        
        setStorageStatus({
          initialized: access.products && access.categories,
          error: !access.products || !access.categories ? 
            "Не удалось получить доступ к хранилищу изображений" : null,
          products: access.products,
          categories: access.categories
        });
        
        if (!access.products || !access.categories) {
          toast({
            title: "Предупреждение",
            description: "Проблемы с доступом к хранилищу изображений",
            variant: "warning"
          });
        } else {
          console.log("Storage buckets initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing storage:", error);
        
        setStorageStatus({
          initialized: false,
          error: "Ошибка инициализации хранилища",
          products: false,
          categories: false
        });
        
        toast({
          title: "Ошибка",
          description: "Не удалось инициализировать хранилище",
          variant: "destructive"
        });
      } finally {
        setIsCheckingStorage(false);
      }
    };
    
    initStorage();
  }, [toast]);

  // Test storage connection to diagnose issues
  const checkStorageConnection = async () => {
    try {
      setIsCheckingStorage(true);
      toast({
        title: "Проверка хранилища",
        description: "Выполняется проверка соединения с хранилищем...",
      });
      
      const productsTest = await testStorageConnection('products');
      const categoriesTest = await testStorageConnection('categories');
      
      console.log("Storage connection test results:", { products: productsTest, categories: categoriesTest });
      
      setStorageStatus({
        initialized: productsTest.success && categoriesTest.success,
        error: !productsTest.success || !categoriesTest.success ? 
          `Проблемы с доступом к хранилищу: ${!productsTest.success ? productsTest.message : ''} ${!categoriesTest.success ? categoriesTest.message : ''}` : null,
        products: productsTest.success,
        categories: categoriesTest.success
      });
      
      toast({
        title: productsTest.success && categoriesTest.success ? "Хранилище доступно" : "Проблемы с хранилищем",
        description: productsTest.success && categoriesTest.success ? 
          "Соединение с хранилищем успешно установлено" : 
          "Обнаружены проблемы с хранилищем. Проверьте консоль для деталей.",
        variant: productsTest.success && categoriesTest.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Error checking storage connection:", error);
      
      toast({
        title: "Ошибка",
        description: "Не удалось проверить соединение с хранилищем",
        variant: "destructive"
      });
    } finally {
      setIsCheckingStorage(false);
    }
  };

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
    console.log("Form submitted with values:", values);
    console.log("Image for product:", imageForProduct);
    
    // For external URLs, check if storage is needed
    const needsStorage = imageForProduct && typeof imageForProduct !== 'string';
    
    // Check if the storage buckets are ready (only if we're uploading a file)
    if (needsStorage && !storageStatus.initialized) {
      toast({
        title: 'Предупреждение',
        description: 'Хранилище для изображений не готово. Изображение может не быть загружено.',
        variant: 'warning',
      });
    }
    
    onSubmit(values, imageForProduct);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        {storageStatus.error && !imageForProduct?.toString().startsWith('http') && (
          <AlertVariant variant="warning" className="mb-4">
            <AlertTitle>Проблема с хранилищем изображений</AlertTitle>
            <AlertDescription>
              {storageStatus.error}
              <div className="mt-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={checkStorageConnection}
                  disabled={isCheckingStorage}
                >
                  {isCheckingStorage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Проверка...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" /> Проверить соединение
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </AlertVariant>
        )}

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
                      console.log("New image selected:", typeof file === 'string' ? 'URL: ' + file : 'File: ' + file.name);
                      setImageForProduct(file);
                    }}
                    previewUrl={
                      typeof imageForProduct === 'string' ? imageForProduct :
                      imageForProduct ? URL.createObjectURL(imageForProduct) :
                      (field.value || null)
                    }
                    disabled={isSubmitting || isCheckingStorage}
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
