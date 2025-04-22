
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  exportProductsToCSV,
  importProductsFromCSV,
  addCategory,
  uploadProductImage,
  uploadCategoryImage
} from '@/services/supabaseService';
import { Product, Category } from '@/types/product';

import ProductEditDialog from '@/components/admin/products/ProductEditDialog';
import ProductTable from '@/components/admin/products/ProductTable';
import CSVImportExportButtons from '@/components/admin/products/CSVImportExportButtons';
import { Search } from "lucide-react";
import { Input } from '@/components/ui/input';

const productSchema = z.object({
  title: z.string().min(1, { message: 'Название товара обязательно' }),
  description: z.string().min(1, { message: 'Описание обязательно' }),
  price: z.coerce.number().positive({ message: 'Цена должна быть положительным числом' }),
  category: z.string().min(1, { message: 'Выберите категорию' }),
  imageUrl: z.string().url({ message: 'Введите корректный URL изображения' }),
  quantity: z.coerce.number().int().positive({ message: 'Количество должно быть положительным числом' }),
  available: z.boolean().default(true)
});

type ProductFormValues = z.infer<typeof productSchema>;

const statusOptions = [
  { value: "pending", label: "Ожидание" },
  { value: "confirmed", label: "Подтвержден" },
  { value: "cancelled", label: "Отменён" },
  { value: "completed", label: "Завершён" },
];

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [fileForProduct, setFileForProduct] = useState<File | null>(null);
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: getProducts
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category: '',
      imageUrl: '',
      quantity: 1,
      available: true
    }
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({
        title: 'Товар создан',
        description: 'Новый товар успешно добавлен в каталог',
      });
      setOpen(false);
      form.reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; product: Partial<Product> }) => 
      updateProduct(data.id, data.product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({
        title: 'Товар обновлен',
        description: 'Товар успешно обновлен',
      });
      setOpen(false);
      setEditProduct(null);
      form.reset();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({
        title: 'Товар удален',
        description: 'Товар успешно удален из каталога',
      });
    }
  });

  const addCategoryMutation = useMutation({
    mutationFn: (categoryData: Partial<Category>) => {
      return addCategory(categoryData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория добавлена',
        description: `Категория "${data.name}" успешно добавлена`,
      });
      setNewCategoryName('');
      setShowCategoryInput(false);
      form.setValue('category', data.name);
    }
  });

  const importMutation = useMutation({
    mutationFn: importProductsFromCSV,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Импорт завершен',
        description: `Импортировано ${data.length} товаров`,
      });
      setIsUploading(false);
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Ошибка импорта',
        description: 'Не удалось импортировать файл',
      });
      setIsUploading(false);
    }
  });

  const filteredProducts = products?.filter(product => 
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const onSubmit = async (values: ProductFormValues) => {
    let imageUrl = values.imageUrl;

    if (fileForProduct) {
      try {
        imageUrl = await uploadProductImage(fileForProduct);
        setFileForProduct(null);
      } catch (e) {
        toast({ variant: "destructive", title: "Ошибка загрузки", description: "Не удалось загрузить изображение товара" });
        return;
      }
    }

    const payload = { ...values, imageUrl };
    if (editProduct) {
      updateMutation.mutate({ id: editProduct.id, product: payload });
    } else {
      createMutation.mutate(payload as any);
    }
  };

  const handleAddCategory = async ({ name, imageUrl, slug }: { name: string; imageUrl?: string; slug: string }) => {
    let imageUrlReturned: string | undefined = imageUrl;
    if (fileForCategory) {
      try {
        imageUrlReturned = await uploadCategoryImage(fileForCategory);
        setFileForCategory(null);
      } catch (e) {
        toast({ variant: "destructive", title: "Ошибка загрузки", description: "Не удалось загрузить изображение категории" });
        return;
      }
    }
    if (name.trim()) {
      addCategoryMutation.mutate({
        name,
        imageUrl: imageUrlReturned,
        slug,
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditProduct(product);
    form.reset({
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      imageUrl: product.imageUrl,
      quantity: product.quantity,
      available: product.available
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот товар?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = async () => {
    const csvContent = await exportProductsToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'products.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      importMutation.mutate(content);
    };
    reader.readAsText(file);
    
    event.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Товары</h1>
          <p className="text-muted-foreground">
            Управление каталогом товаров для проката
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              type="button"
              className="absolute left-0 top-0 h-9 w-9 border-0 flex items-center justify-center z-10"
              tabIndex={-1}
              aria-label="search"
              style={{ background: "transparent" }}
            >
              <Search className="h-4 w-4" />
            </button>
            <Input
              placeholder="Поиск товаров..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          
          <ProductEditDialog
            open={open}
            setOpen={setOpen}
            editProduct={editProduct}
            form={form}
            categories={categories ?? []}
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
            createPending={createMutation.isPending}
            updatePending={updateMutation.isPending}
          />

          <CSVImportExportButtons
            isUploading={isUploading}
            handleExport={handleExport}
            handleImport={handleImport}
          />
        </div>
      </div>
      <ProductTable
        products={filteredProducts || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        updateMutation={updateMutation}
        statusOptions={statusOptions}
      />
    </div>
  );
};

export default AdminProducts;
