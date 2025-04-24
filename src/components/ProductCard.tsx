
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/pricingUtils';
import { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  selectedStartDate?: Date;
  selectedEndDate?: Date;
}

const ProductCard = ({ product, selectedStartDate, selectedEndDate }: ProductCardProps) => {
  return (
    <Link 
      to={`/product/${product.id}`} 
      state={{ startDate: selectedStartDate, endDate: selectedEndDate }}
      className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-md transition-transform hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              // If image fails to load, use placeholder
              const target = e.target as HTMLImageElement;
              target.onerror = null; // Prevent infinite loop
              target.src = 'https://via.placeholder.com/300x200?text=No+Image';
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-200">
            <span className="text-gray-400">Нет изображения</span>
          </div>
        )}
        
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-white/90 text-black font-medium">
            {product.category}
          </Badge>
        </div>
        
        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <Badge variant="destructive" className="px-3 py-1.5">Забронирован</Badge>
          </div>
        )}
      </div>
      
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 font-medium text-lg line-clamp-1">{product.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground line-clamp-2">{product.description}</p>
        <div className="mt-auto flex items-center justify-between">
          <p className="font-medium">
            {formatCurrency(product.price)}
            <span className="text-xs text-muted-foreground"> / в сутки</span>
          </p>
          <Badge 
            variant={product.available ? "outline" : "secondary"} 
            className={product.available ? "text-green-600 border-green-200 bg-green-50" : ""}
          >
            {product.available ? "Доступен" : "Недоступен"}
          </Badge>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
