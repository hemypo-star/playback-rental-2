import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product } from '@/types/product';
import * as supabaseService from '@/services/supabaseService';
import { uploadCategoryImage } from '@/utils/imageUtils';
import ProductEditDialog from '@/components/admin/products/ProductEditDialog';
import ProductList from '@/components/admin/products/ProductList';
import ImportExport from '@/components/admin/products/ImportExport';
import { ProductFormValues } from '@/components/admin/products/ProductForm';
import { productFormSchema } from '@/components/admin/products/ProductForm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetStoragePermissions } from '@/services/storageService';

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForProduct, setFileForProduct] = useState<File | null>(null);
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category: '',
      imageUrl: '',
      quantity: 1,
      available: true,
    },
  });

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: supabaseService.getProducts,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: supabaseService.getCategories,
  });

  const createProductMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      try {
        return supabaseService.createProduct({
          ...values,
        }, fileForProduct);
      } catch (error) {
        console.error('Error in createProductMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Товар добавлен',
        description: 'Товар успешно добавлен в каталог',
      });
      setOpenDialog(false);
      form.reset();
      setFileForProduct(null);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить товар: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async (values: { id: string; product: Partial<Product> }) => {
      try {
        return supabaseService.updateProduct(values.id, values.product, fileForProduct);
      } catch (error) {
        console.error('Error in updateProductMutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data) {
        toast({
          title: 'Ошибка',
          description: 'Не удалось обновить товар',
          variant: 'destructive',
        });
        return;
      }
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Товар обновлен',
        description: 'Товар успешно обновлен',
      });
      setOpenDialog(false);
      form.reset();
      setEditProduct(null);
      setFileForProduct(null);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить товар: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => supabaseService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Товар удален',
        description: 'Товар успешно удален из каталога',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить товар: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (categoryData: { name: string; slug: string; imageUrl?: string }) => {
      if (fileForCategory) {
        const imageUrl = await uploadCategoryImage(fileForCategory, categoryData.name);
        categoryData.imageUrl = imageUrl;
      }
      return supabaseService.addCategory(categoryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleAddCategory = async (payload: { name: string; slug: string; imageUrl?: string }) => {
    try {
      let imageUrl = payload.imageUrl;
      if (fileForCategory) {
        imageUrl = await uploadCategoryImage(fileForCategory);
      }
      
      const newCategory = await supabaseService.addCategory({
        name: payload.name,
        slug: payload.slug,
        imageUrl: imageUrl || '',
      });
      
      if (newCategory) {
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        form.setValue('category', newCategory.name);
        setShowCategoryInput(false);
        setNewCategoryName('');
        setFileForCategory(null);
        
        toast({
          title: 'Категория добавлена',
          description: 'Новая категория успешно добавлена',
        });
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить категорию: ${error}`,
        variant: 'destructive',
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    form.reset({
      title: product.title,
      description: product.description || '',
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl || '',
      quantity: product.quantity,
      available: product.available,
    });
    setOpenDialog(true);
    setFileForProduct(null); // Reset file when editing
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      deleteProductMutation.mutate(id);
    }
  };

  const onSubmit = async (formData: ProductFormValues, imageFile: File | null) => {
    if (!editProduct) return;
    
    setFileForProduct(imageFile);
  
    try {
      const cleanUpdates: Partial<Product> = {};
  
      if (formData.title && formData.title.trim() !== '') {
        cleanUpdates.title = formData.title;
      }
      
      if (formData.description !== undefined) {
        cleanUpdates.description = formData.description;
      }
      
      if (formData.price !== undefined) {
        cleanUpdates.price = formData.price;
      }
      
      if (formData.category && formData.category.trim() !== '') {
        cleanUpdates.category = formData.category;
      }
      
      if (formData.imageUrl && formData.imageUrl.trim() !== '') {
        cleanUpdates.imageUrl = formData.imageUrl;
      }
      
      if (formData.available !== undefined) {
        cleanUpdates.available = formData.available;
      }
      
      if (formData.quantity !== undefined) {
        cleanUpdates.quantity = formData.quantity;
      }
      
      if (Object.keys(cleanUpdates).length === 0 && !imageFile) {
        toast({ 
          title: 'Нет изменений',
          description: 'Вы не внесли никаких изменений в товар'
        });
        setOpenDialog(false);
        return;
      }
  
      await updateProductMutation.mutateAsync({
        id: editProduct.id,
        product: cleanUpdates
      });
    } catch (error) {
      console.error('Ошибка при обновлении товара:', error);
      toast({ 
        title: 'Ошибка обновления товара', 
        variant: 'destructive' 
      });
    }
  };

  // Initialize storage buckets when the page loads
  useEffect(() => {
    const initStorage = async () => {
      try {
        console.log("Initializing storage buckets...");
        const result = await resetStoragePermissions();
        if (result) {
          console.log("Storage buckets initialized successfully");
        } else {
          console.error("Failed to initialize storage buckets");
          toast({
            title: 'Предупреждение',
            description: 'Не удалось инициализировать хранилище для изображений',
            variant: 'warning'
          });
        }
      } catch (error) {
        console.error("Error initializing storage:", error);
        toast({
          title: 'Ошибка',
          description: 'Ошибка инициализации хранилища',
          variant: 'destructive'
        });
      }
    };
    
    initStorage();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Управление товарами</h2>
        <div className="flex gap-2">
          <ProductEditDialog
            open={openDialog}
            setOpen={setOpenDialog}
            editProduct={editProduct}
            form={form}
            categories={categories || []}
            showCategoryInput={showCategoryInput}
            setShowCategoryInput={setShowCategoryInput}
            newCategoryName={newCategoryName}
            setNewCategoryName={setNewCategoryName}
            fileForProduct={fileForProduct}
            setFileForProduct={setFileForProduct}
            fileForCategory={fileForCategory}
            setFileForCategory={setFileForCategory}
            addCategoryMutation={addCategoryMutation}
            onSubmit={onSubmit}
            handleAddCategory={handleAddCategory}
            createPending={createProductMutation.isPending}
            updatePending={updateProductMutation.isPending}
          />
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="import-export">Импорт/Экспорт</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="space-y-4">
          <ProductList
            products={products}
            isLoading={isLoadingProducts}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            updateMutation={updateProductMutation}
          />
        </TabsContent>
        
        <TabsContent value="import-export">
          <ImportExport />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProducts;
