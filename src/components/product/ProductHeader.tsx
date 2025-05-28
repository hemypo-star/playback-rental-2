
import { Badge } from '@/components/ui/badge';
import { TagIcon } from 'lucide-react';
import { Product } from '@/types/product';

interface ProductHeaderProps {
  product: Product;
}

const ProductHeader = ({ product }: ProductHeaderProps) => {
  return (
    <div>
      <Badge variant="outline" className="mb-3">
        <TagIcon className="h-3 w-3 mr-1" />
        {product.category}
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
