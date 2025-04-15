import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Plus,
  Search,
  Trash2,
  Pencil,
  Upload,
  Download,
  Image,
  X
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  addCategory
} from '@/services/supabaseService';
import { Product, Category } from '@/types/product';

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

const AdminProducts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);

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
    mutationFn: (name: string) => {
      return addCategory({
        name: name,
        slug: name.toLowerCase().replace(/\s+/g, '-')
      });
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

  const onSubmit = (values: ProductFormValues) => {
    if (editProduct) {
      updateMutation.mutate({ id: editProduct.id, product: values });
    } else {
      createMutation.mutate(values as any);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategoryMutation.mutate(newCategoryName);
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
            <Button 
              variant="outline" 
              size="icon" 
              className="absolute left-0 top-0 h-9 w-9 border-0"
            >
              <Search className="h-4 w-4" />
            </Button>
            <Input
              placeholder="Поиск товаров..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить товар
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editProduct ? 'Редактировать товар' : 'Добавить новый товар'}
                </DialogTitle>
                <DialogDescription>
                  {editProduct 
                    ? 'Измените информацию о товаре и нажмите Сохранить'
                    : 'Заполните информацию о новом товаре для добавления в каталог'
                  }
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Категория</FormLabel>
                        {showCategoryInput ? (
                          <div className="flex gap-2">
                            <Input 
                              placeholder="Новая категория..."
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              className="flex-1"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleAddCategory}
                              size="sm"
                            >
                              Добавить
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setShowCategoryInput(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите категорию" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((category: Category) => (
                                  <SelectItem key={category.id} value={category.name}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={() => setShowCategoryInput(true)}
                              size="sm"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Название</FormLabel>
                        <FormControl>
                          <Input placeholder="Sony Alpha A7 III" {...field} />
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
                          <Textarea 
                            placeholder="Полнокадровая беззеркальная камера..."
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Цена за сутки (₽)</FormLabel>
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
                  
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL изображения</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/image.jpg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="available"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Доступно для бронирования
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setOpen(false);
                        setEditProduct(null);
                        form.reset();
                      }}
                    >
                      Отмена
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending
                        ? 'Сохранение...'
                        : editProduct ? 'Сохранить изменения' : 'Добавить товар'
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Экспорт CSV
            </Button>
            
            <div className="relative">
              <Button variant="outline" disabled={isUploading}>
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Загрузка...' : 'Импорт CSV'}
              </Button>
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
            </div>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredProducts?.length === 0 ? (
        <div className="text-center p-8">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Товары не найдены</h3>
          <p className="text-muted-foreground mb-4">
            Попробуйте изменить поисковый запрос или добавьте новые товары
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Фото</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Название</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead className="text-right">Цена / сутки</TableHead>
                <TableHead>Кол-во</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.imageUrl ? (
                      <div 
                        className="w-10 h-10 rounded bg-center bg-cover"
                        style={{ backgroundImage: `url(${product.imageUrl})` }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Image className="h-5 w-5 opacity-70" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{product.id}</TableCell>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{product.price.toLocaleString()} ₽</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell>
                    {product.available ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
                        Доступен
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">
                        Недоступен
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
