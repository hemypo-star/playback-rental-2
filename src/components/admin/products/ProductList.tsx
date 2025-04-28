
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { UseMutationResult, useQueryClient } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Product } from '@/types/product';
import ProductTableRow from '@/components/admin/products/ProductTableRow';
import { Loader2 } from 'lucide-react';

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
                    <TableCell colSpan={7} className="h-24 text-center">
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
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
