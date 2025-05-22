
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/services/product/productBasicService";

export const useProductQueries = () => {
  // Query to fetch products
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Query to fetch categories from products
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const products = await getProducts();
      const uniqueCategories = [...new Set(products.map(prod => prod.category))];
      return uniqueCategories.map(cat => ({ name: cat }));
    },
    enabled: !!productsQuery.data,
  });

  return {
    products: productsQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoadingProducts: productsQuery.isLoading,
  };
};
