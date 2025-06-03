
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types/product';

// Define the product form schema
export const productFormSchema = z.object({
  title: z.string().min(2, {
    message: 'Название должно содержать минимум 2 символа',
  }),
  description: z.string().optional(),
  price: z.coerce.number().min(1, {
    message: 'Цена должна быть больше 0',
  }),
  category_id: z.coerce.number().min(1, {
    message: 'Выберите категорию',
  }),
  imageUrl: z.string().optional(),
  quantity: z.coerce.number().min(1, {
    message: 'Количество должно быть больше 0',
  }),
  available: z.boolean().default(true),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const useProductForm = (
  editProduct: Product | null,
  onSubmit: (values: ProductFormValues) => void,
  setImageForProduct: (file: File | string | null) => void
) => {
  const { toast } = useToast();
  
  // State for category management
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Initialize form with default values or edit product values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category_id: 0,
      imageUrl: '',
      quantity: 1,
      available: true,
    },
  });

  // Update form values when editProduct changes
  useEffect(() => {
    if (editProduct) {
      console.log('Setting form values for edit product:', editProduct);
      console.log('Edit product available status:', editProduct.available);
      
      form.reset({
        title: editProduct.title || '',
        description: editProduct.description || '',
        price: editProduct.price || 0,
        category_id: editProduct.category_id || 0,
        imageUrl: editProduct.imageUrl || '',
        quantity: editProduct.quantity || 1,
        available: editProduct.available ?? true,
      });
    } else {
      console.log('Resetting form for new product');
      form.reset({
        title: '',
        description: '',
        price: 0,
        category_id: 0,
        imageUrl: '',
        quantity: 1,
        available: true,
      });
    }
  }, [editProduct, form]);

  // Handle new category addition
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
      
      // Note: We would need to implement category creation here
      // For now, just show a message that this feature needs to be implemented
      toast({
        title: 'Функция в разработке',
        description: 'Создание новых категорий будет добавлено позже',
        variant: 'destructive',
      });
      
      setShowCategoryInput(false);
      setNewCategoryName('');
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

  // Handle form submission
  const handleFormSubmit = (values: ProductFormValues) => {
    console.log("Form submitted with values:", values);
    console.log("Available status being submitted:", values.available);
    
    onSubmit(values);
  };

  return {
    form,
    showCategoryInput,
    setShowCategoryInput,
    newCategoryName,
    setNewCategoryName,
    isAddingCategory,
    handleNewCategory,
    handleFormSubmit
  };
};
