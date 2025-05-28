
import { Badge } from '@/components/ui/badge';
import { TagIcon } from 'lucide-react';
import { Product } from '@/types/product';
import { useQuery } from '@tanstack/react-query';
import { getCategories } from '@/services/categoryService';

interface ProductHeaderProps {
  product: Product;
}

const ProductHeader = ({ product }: ProductHeaderProps) => {
  // Load categories to get category name by ID
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });
  
  // Find the category name for this product
  const categoryName = categories?.find(cat => cat.category_id === product.category_id)?.name || 'Без категории';
  
  return (
    <div>
      <Badge variant="outline" className="mb-3">
        <TagIcon className="h-3 w-3 mr-1" />
        {categoryName}
      </Badge>
      <h1 className="text-3xl md:text-4xl font-semibold mb-2">{product.title}</h1>
      <p className="text-xl mb-4">
        <span className="font-semibold">{product.price}</span>
        <span className="text-muted-foreground"> ₽/в сутки</span>
      </p>
      {product.description && product.description.trim() && (
        <p className="text-muted-foreground">{product.description}</p>
      )}
    </div>
  );
};

export default ProductHeader;
