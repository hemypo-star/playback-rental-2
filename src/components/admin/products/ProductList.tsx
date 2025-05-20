import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Product } from '@/types/product';
import ProductTableRow from '@/components/admin/products/ProductTableRow';
import { Loader2, Trash } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type ProductListProps = {
  products: Product[] | undefined;
  isLoading: boolean;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  updateMutation: UseMutationResult<any, Error, any, any>;
};

const statusOptions = [
  { value: "confirmed", label: "Доступен" },
  { value: "cancelled", label: "Недоступен" },
];

export default function ProductList({
  products,
  isLoading,
  onEditProduct,
  onDeleteProduct,
  updateMutation,
}: ProductListProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleAllProducts = () => {
    if (products && products.length > 0) {
      if (selectedProducts.length === products.length) {
        // If all are selected, unselect all
        setSelectedProducts([]);
      } else {
        // Otherwise, select all
        setSelectedProducts(products.map(p => p.id));
      }
    }
  };

  const handleDeleteSelected = () => {
    setShowDeleteDialog(true);
  };

  const confirmDeleteSelected = () => {
    if (selectedProducts.length === 0) return;
    
    // Delete each selected product
    Promise.all(
      selectedProducts.map(id => onDeleteProduct(id))
    )
      .then(() => {
        toast({
          title: "Успешно удалено",
          description: `${selectedProducts.length} товаров было удалено`,
        });
        setSelectedProducts([]);
        queryClient.invalidateQueries({ queryKey: ['products'] });
      })
      .catch(error => {
        toast({
          title: "Ошибка при удалении",
          description: "Не удалось удалить некоторые товары",
          variant: "destructive",
        });
      })
      .finally(() => {
        setShowDeleteDialog(false);
      });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Список товаров</CardTitle>
        <CardDescription>
          Управляйте товарами в вашем каталоге. Вы можете добавлять, редактировать и удалять товары.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={products?.length ? selectedProducts.length === products.length : false}
                      onCheckedChange={toggleAllProducts}
                      aria-label="Select all products"
                      disabled={!products?.length}
                    />
                  </TableHead>
                  <TableHead style={{ width: 50 }}>Фото</TableHead>
                  <TableHead style={{ width: 100 }}>ID</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Категория</TableHead>
                  <TableHead className="text-right">Цена</TableHead>
                  <TableHead>Кол-во</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!products || products.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Нет товаров
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <ProductTableRow
                      key={product.id}
                      product={product}
                      onEdit={onEditProduct}
                      onDelete={onDeleteProduct}
                      updateMutation={updateMutation}
                      statusOptions={statusOptions}
                      isSelected={selectedProducts.includes(product.id)}
                      onSelectChange={() => toggleProductSelection(product.id)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          {selectedProducts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Выбрано товаров: {selectedProducts.length}
            </span>
          )}
        </div>
        <Button 
          variant="destructive" 
          onClick={handleDeleteSelected} 
          disabled={selectedProducts.length === 0}
        >
          <Trash className="h-4 w-4 mr-2" />
          Удалить выбранное
        </Button>
      </CardFooter>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Подтверждение удаления</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить {selectedProducts.length} товаров? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSelected}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
