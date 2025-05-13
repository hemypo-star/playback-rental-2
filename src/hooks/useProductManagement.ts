
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
    deleteProductMutation,
    addProduct,
    updateProduct
  } = useProductMutations();
  const { 
    isLoading: importExportLoading, 
    handleExport, 
    handleImport 
  } = useProductImportExport();

  // Determine if any operation is loading
  const isLoading = mutationLoading || importExportLoading;

  const handleEditProduct = (product: Product) => {
    setEditProduct(product);
    setOpenDialog(true);
  };

  const handleDeleteProduct = (id: string) => {
    deleteProductMutation.mutate(id);
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
