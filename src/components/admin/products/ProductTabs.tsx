
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductList from '@/components/admin/products/ProductList';
import ImportExport from '@/components/admin/products/ImportExport';
import { Product } from "@/types/product";
import { UseMutationResult } from "@tanstack/react-query";

type ProductTabsProps = {
  products: Product[] | undefined;
  isLoading: boolean;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  updateMutation: UseMutationResult<any, Error, any, any>;
};

export default function ProductTabs({
  products,
  isLoading,
  onEditProduct,
  onDeleteProduct,
  updateMutation
}: ProductTabsProps) {
  return (
    <Tabs defaultValue="products">
      <TabsList>
        <TabsTrigger value="products">Товары</TabsTrigger>
        <TabsTrigger value="import-export">Импорт/Экспорт</TabsTrigger>
      </TabsList>
      
      <TabsContent value="products" className="space-y-4">
        <ProductList
          products={products}
          isLoading={isLoading}
          onEditProduct={onEditProduct}
          onDeleteProduct={onDeleteProduct}
          updateMutation={updateMutation}
        />
      </TabsContent>
      
      <TabsContent value="import-export">
        <ImportExport />
      </TabsContent>
    </Tabs>
  );
}
