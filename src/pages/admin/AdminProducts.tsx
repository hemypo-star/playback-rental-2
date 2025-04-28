import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Product } from '@/types/product';
import * as supabaseService from '@/services/supabaseService';
import ProductEditDialog from '@/components/admin/products/ProductEditDialog';
import ProductTableRow from '@/components/admin/products/ProductTableRow';
import { Download, Upload, Loader2 } from 'lucide-react';

const formSchema = z.object({
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

const statusOptions = [
  { value: 'confirmed', label: 'Доступен' },
  { value: 'cancelled', label: 'Недоступен' },
];

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForProduct, setFileForProduct] = useState<File | null>(null);
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      try {
        let imageUrl = values.imageUrl || '';
        
        if (fileForProduct) {
          imageUrl = await supabaseService.uploadProductImage(fileForProduct);
        }
        
        return supabaseService.createProduct({
          ...values,
          imageUrl,
        });
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
        if (fileForProduct) {
          const imageUrl = await supabaseService.uploadProductImage(fileForProduct);
          values.product.imageUrl = imageUrl;
        }
        
        return supabaseService.updateProduct(values.id, values.product);
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
    mutationFn: (categoryData: { name: string; slug: string; imageUrl?: string }) => 
      supabaseService.addCategory(categoryData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const handleAddCategory = async (payload: { name: string; slug: string; imageUrl?: string }) => {
    setIsAddingCategory(true);
    try {
      let imageUrl = payload.imageUrl;
      if (fileForCategory) {
        imageUrl = await supabaseService.uploadCategoryImage(fileForCategory);
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
    } finally {
      setIsAddingCategory(false);
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
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      deleteProductMutation.mutate(id);
    }
  };

  const onSubmit = async (formData: z.infer<typeof formSchema>) => {
    if (!editProduct) return;
  
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
      
      if (Object.keys(cleanUpdates).length === 0 && !fileForProduct) {
        toast({ 
          title: 'Нет изменений',
          description: 'Вы не внесли никаких изменений в товар'
        });
        setOpenDialog(false);
        return;
      }
  
      const updatedProduct = await updateProductMutation.mutateAsync({
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

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const csvContent = await supabaseService.exportProductsToCSV();
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Экспорт завершен',
        description: 'Файл CSV успешно скачан',
      });
    } catch (error) {
      toast({
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать товары',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      toast({
        title: 'Ошибка',
        description: 'Выберите файл CSV для импорта',
        variant: 'destructive',
      });
      return;
    }
    
    setIsImporting(true);
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        await supabaseService.importProductsFromCSV(text);
        
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast({
          title: 'Импорт завершен',
          description: 'Товары успешно импортированы',
        });
        
        setCsvFile(null);
        setIsImporting(false);
      };
      
      reader.onerror = () => {
        toast({
          title: 'Ошибка чтения файла',
          description: 'Не удалось прочитать файл CSV',
          variant: 'destructive',
        });
        setIsImporting(false);
      };
      
      reader.readAsText(csvFile);
    } catch (error) {
      toast({
        title: 'Ошибка импорта',
        description: 'Не удалось импортировать товары',
        variant: 'destructive',
      });
      setIsImporting(false);
    }
  };

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
          <Card>
            <CardHeader>
              <CardTitle>Список товаров</CardTitle>
              <CardDescription>
                Управляйте товарами в вашем каталоге. Вы можете добавлять, редактировать и удалять товары.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead style={{ width: 50 }}>Фото</TableHead>
                        <TableHead style={{ width: 100 }}>ID</TableHead>
                        <TableHead>Название</TableHead>
                        <TableHead>Категория</TableHead>
                        <TableHead className="text-right">Цена</TableHead>
                        <TableHead>Кол-во</TableHead>
                        <TableHead>Статус</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center">
                            Нет товаров
                          </TableCell>
                        </TableRow>
                      ) : (
                        products?.map((product) => (
                          <ProductTableRow
                            key={product.id}
                            product={product}
                            onEdit={handleEditProduct}
                            onDelete={handleDeleteProduct}
                            updateMutation={updateProductMutation}
                            statusOptions={statusOptions}
                          />
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="import-export">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Экспорт товаров</CardTitle>
                <CardDescription>
                  Экспортируйте все товары в формате CSV для резервного копирования или редактирования.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleExportCSV} 
                  disabled={isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Экспорт...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Экспортировать в CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Импорт товаров</CardTitle>
                <CardDescription>
                  Импортируйте товары из CSV файла. Формат должен соответствовать экспортированному файлу.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    disabled={isImporting}
                  />
                </div>
                <Button 
                  onClick={handleImportCSV} 
                  disabled={!csvFile || isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Импорт...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Импортировать из CSV
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminProducts;
