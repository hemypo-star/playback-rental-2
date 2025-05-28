
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/product/productBasicService";
import { getCategories } from "@/services/categoryService";

export const useProductQueries = () => {
  // Query to fetch products
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Query to fetch categories
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  return {
    products: productsQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoadingProducts: productsQuery.isLoading,
  };
};
