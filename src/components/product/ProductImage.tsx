
import { Badge } from '@/components/ui/badge';
import AnimatedTransition from '@/components/AnimatedTransition';
import { Product } from '@/types/product';

interface ProductImageProps {
  product: Product;
}

const ProductImage = ({ product }: ProductImageProps) => {
  return (
    <AnimatedTransition show={true} type="fade" className="relative aspect-[4/3] rounded-xl overflow-hidden subtle-ring">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${product.imageUrl})` }}
      ></div>
      
      <Badge 
        variant="secondary" 
        className="absolute top-4 left-4 bg-white/90 text-black font-medium"
      >
        {product.category}
      </Badge>
      
      {!product.available && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <Badge variant="destructive" className="px-4 py-2 text-base">Забронирован</Badge>
        </div>
      )}
    </AnimatedTransition>
  );
};

export default ProductImage;
