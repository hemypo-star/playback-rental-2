
import { TableRow, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import StatusDropdown from "@/components/admin/StatusDropdown";
import { Badge } from "@/components/ui/badge";
import { Image } from "lucide-react";
import { Product, Category } from "@/types/product";
import { getProductImageUrl } from "@/utils/imageUtils";
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/services/categoryService';

type Props = {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  updateMutation: any;
  statusOptions: { value: string; label: string }[];
  isSelected?: boolean;
  onSelectChange?: () => void;
};

export default function ProductTableRow({
  product, 
  onEdit, 
  onDelete, 
  updateMutation, 
  statusOptions,
  isSelected = false,
  onSelectChange = () => {}
}: Props) {
  const imageUrl = product.imageUrl ? getProductImageUrl(product.imageUrl) : null;
  
  // Load categories to get category name by ID
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });
  
  // Find the category name for this product
  const categoryName = categories?.find(cat => cat.category_id === product.category_id)?.name || 'Без категории';

  return (
    <TableRow key={product.id}>
      <TableCell>
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={onSelectChange}
          aria-label={`Select ${product.title}`} 
        />
      </TableCell>
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
      <TableCell className="font-mono text-sm">{product.id.substring(0, 8)}...</TableCell>
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
        <Badge variant="outline">{categoryName}</Badge>
      </TableCell>
      <TableCell className="text-right">{product.price.toLocaleString()} ₽</TableCell>
      <TableCell>{product.quantity}</TableCell>
      <TableCell>
        <StatusDropdown
          value={product.available ? "confirmed" : "cancelled"}
          onChange={(newStatus) => {
            updateMutation.mutate({ id: product.id, data: { available: newStatus === "confirmed" } });
          }}
          options={statusOptions}
          disabled={updateMutation.isPending}
        />
      </TableCell>
    </TableRow>
  );
}
