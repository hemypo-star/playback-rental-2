
import { useState } from "react";
import { Product } from "@/types/product";
import { ProductFormValues } from "@/types/product-form";
import { useProductMutations } from "./product/useProductMutations";
import { useProductQueries } from "./product/useProductQueries";
import { useProductImportExport } from "./product/useProductImportExport";

export type { ProductFormValues } from "@/types/product-form";

export const useProductManagement = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [imageForProduct, setImageForProduct] = useState<File | string | null>(null);

  // Import product hooks
  const { products, categories, isLoadingProducts } = useProductQueries();
  const { 
    isLoading: mutationLoading, 
    createProductMutation, 
    updateProductMutation, 
    deleteProductMutation 
  } = useProductMutations();
  const { 
    isLoading: importExportLoading, 
    handleExport, 
    handleImport 
  } = useProductImportExport();

  // Determine if any operation is loading
  const isLoading = mutationLoading || importExportLoading;

  const handleEditProduct = (product: Product) => {
    console.log("Setting product for editing:", product);
    setEditProduct(product);
    setOpenDialog(true);
  };

  const handleDeleteProduct = (id: string) => {
    deleteProductMutation.mutate(id);
  };

  const addProduct = async (formData: ProductFormValues, imageFile: File | string | null) => {
    console.log("Adding new product:", formData);
    try {
      await createProductMutation.mutateAsync({
        data: formData,
        imageFile: imageFile instanceof File ? imageFile : (typeof imageFile === 'string' ? imageFile : undefined)
      });
      console.log("Product created successfully");
    } catch (error) {
      console.error("Failed to create product:", error);
      throw error;
    }
  };

  return {
    products,
    categories,
    isLoadingProducts,
    isLoading,
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
    addProduct,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    handleExport,
    handleImport
  };
};
