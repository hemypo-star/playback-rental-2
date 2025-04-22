
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package } from "lucide-react";
import ProductTableRow from "./ProductTableRow";
import { Product } from "@/types/product";

type Props = {
  products: Product[];
  isLoading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  updateMutation: any;
  statusOptions: { value: string; label: string }[];
};

export default function ProductTable({
  products, isLoading, onEdit, onDelete, updateMutation, statusOptions,
}: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center p-8">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Товары не найдены</h3>
        <p className="text-muted-foreground mb-4">
          Попробуйте изменить поисковый запрос или добавьте новые товары
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Фото</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead className="text-right">Цена / сутки</TableHead>
            <TableHead>Кол-во</TableHead>
            <TableHead>Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products?.map((product) => (
            <ProductTableRow
              key={product.id}
              product={product}
              onEdit={onEdit}
              onDelete={onDelete}
              updateMutation={updateMutation}
              statusOptions={statusOptions}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
