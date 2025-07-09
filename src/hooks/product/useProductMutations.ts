
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
import { uploadProductImage } from "@/utils/imageUtils";
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
        let imageUrl = productData.imageUrl;
        
        // Handle image upload if it's a File object
        if (productData.imageFile && productData.imageFile instanceof File) {
          imageUrl = await uploadProductImage(productData.imageFile);
        } else if (productData.imageUrl) {
          // For external URLs or any other imageUrl, use them directly
          imageUrl = productData.imageUrl;
          console.log('Using image URL directly:', imageUrl);
        }

        // Create product with the image URL (either uploaded or external URL)
        const newProduct = await createProduct({
          ...productData,
          imageUrl: imageUrl || '',
        }, productData.imageFile); // Fixed: Using productData.imageFile instead of undefined imageFile

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
        let imageUrl = data.imageUrl;
        let imageFile = data.imageFile;
        
        // Handle image upload if it's a File object
        if (data.imageFile && data.imageFile instanceof File) {
          imageUrl = await uploadProductImage(data.imageFile, id);
        } else if (data.imageUrl?.startsWith('http')) {
          // For external URLs, use them directly
          imageUrl = data.imageUrl;
          console.log('Using external image URL directly:', imageUrl);
        }

        // Update product with the image URL (either newly uploaded or existing)
        const updatedProduct = await updateProduct(id, {
          ...data,
          imageUrl: imageUrl || '',
        }, imageFile);

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
