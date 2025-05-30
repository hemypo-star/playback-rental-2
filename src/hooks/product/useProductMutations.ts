
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  createProduct,
} from "@/services/product/productCreateService";
import { 
  updateProduct,
} from "@/services/product/productUpdateService";
import { 
  deleteProduct 
} from "@/services/product/productDeleteService";
import { Product } from "@/types/product";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { ProductFormValues } from "@/types/product-form";

export const useProductMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Add product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormValues) => {
      setIsLoading(true);
      try {
        // Create product with the image URL
        const newProduct = await createProduct({
          ...productData,
          imageUrl: productData.imageUrl || '',
        }, productData.imageUrl);

        return newProduct;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Продукт добавлен",
        description: "Новый продукт успешно добавлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось добавить продукт: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormValues }) => {
      setIsLoading(true);
      try {
        // Update product with the image URL
        const updatedProduct = await updateProduct(id, {
          ...data,
          imageUrl: data.imageUrl || '',
        }, data.imageUrl);

        return updatedProduct;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Продукт обновлен",
        description: "Продукт успешно обновлен",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось обновить продукт: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      setIsLoading(true);
      try {
        const result = await deleteProduct(id);
        if (!result) {
          throw new Error(`Failed to delete product with ID ${id}`);
        }
        return result;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: "Продукт удален",
        description: "Продукт успешно удален",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: `Не удалось удалить продукт: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteProduct = async (id: string): Promise<boolean> => {
    try {
      await deleteProductMutation.mutateAsync(id);
      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      return false;
    }
  };

  return {
    isLoading,
    createProductMutation,
    updateProductMutation,
    deleteProductMutation,
    addProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: handleDeleteProduct
  };
};
