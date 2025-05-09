
import { TableRow, TableCell } from "@/components/ui/table";
import StatusDropdown from "@/components/admin/StatusDropdown";
import { Badge } from "@/components/ui/badge";
import { Image } from "lucide-react";
import { Product } from "@/types/product";
import { getProductImageUrl } from "@/utils/imageUtils";

type Props = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  updateMutation: any;
  statusOptions: { value: string; label: string }[];
};

export default function ProductTableRow({
  product, onEdit, onDelete, updateMutation, statusOptions,
}: Props) {
  const imageUrl = getProductImageUrl(product.imageUrl);

  return (
    <TableRow key={product.id}>
      <TableCell>
        {imageUrl ? (
          <div 
            className="w-10 h-10 rounded bg-center bg-cover"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
            <Image className="h-5 w-5 opacity-70" />
          </div>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs">{product.id}</TableCell>
      <TableCell className="font-medium">
        <div className="flex justify-between items-center gap-2">
          {product.title}
          {/* Edit/Delete inline actions for quick access */}
          <span>
            <button
              className="text-xs text-blue-600 hover:underline mr-2"
              onClick={() => onEdit(product)}
              type="button"
            >
              Редактировать
            </button>
            <button
              className="text-xs text-red-600 hover:underline"
              onClick={() => onDelete(product.id)}
              type="button"
            >
              Удалить
            </button>
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{product.category}</Badge>
      </TableCell>
      <TableCell className="text-right">{product.price.toLocaleString()} ₽</TableCell>
      <TableCell>{product.quantity}</TableCell>
      <TableCell>
        <StatusDropdown
          value={product.available ? "confirmed" : "cancelled"}
          onChange={(newStatus) => {
            updateMutation.mutate({ id: product.id, product: { available: newStatus === "confirmed" } });
          }}
          options={statusOptions}
        />
      </TableCell>
    </TableRow>
  );
}
