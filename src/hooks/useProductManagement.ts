
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types/product';
import * as supabaseService from '@/services/supabaseService';
import { ProductFormValues } from '@/components/admin/products/ProductForm';

export const useProductManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [imageForProduct, setImageForProduct] = useState<File | string | null>(null);

  // Fetch products data
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: supabaseService.getProducts,
  });

  // Fetch categories data
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: supabaseService.getCategories,
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      try {
        return supabaseService.createProduct({
          ...values,
        }, imageForProduct);
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
      setImageForProduct(null);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить товар: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (values: { id: string; product: Partial<Product> }) => {
      try {
        return supabaseService.updateProduct(values.id, values.product, imageForProduct);
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
      setEditProduct(null);
      setImageForProduct(null);
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить товар: ${error}`,
        variant: 'destructive',
      });
    }
  });

  // Delete product mutation
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

  // Handle editing a product
  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setOpenDialog(true);
    setImageForProduct(null); // Reset image when editing
  };

  // Handle deleting a product
  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      deleteProductMutation.mutate(id);
    }
  };

  return {
    products,
    categories,
    isLoadingProducts,
    isLoadingCategories,
    openDialog,
    setOpenDialog,
    editProduct,
    setEditProduct,
    imageForProduct,
    setImageForProduct,
    createProductMutation,
    updateProductMutation,
    deleteProductMutation,
    handleEditProduct,
    handleDeleteProduct,
  };
};
