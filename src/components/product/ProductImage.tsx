
import OptimizedImage from '@/components/OptimizedImage';
import { Product } from '@/types/product';
import { getOptimizedImageUrl } from '@/utils/optimizedImageUtils';

type ProductImageProps = {
  imageUrl: string;
  title: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
} | {
  product: Product;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

const ProductImage = (props: ProductImageProps) => {
  // Extract values from props
  const imageUrl = 'product' in props ? props.product.imageUrl : props.imageUrl;
  const title = 'product' in props ? props.product.title : props.title;
  const { className, width = 400, height = 300, priority = false } = props;

  if (!imageUrl) {
    return (
      <OptimizedImage
        src="/placeholder.svg"
        alt={title}
        className={className}
        width={width}
        height={height}
        priority={priority}
      />
    );
  }

  const optimizedSrc = getOptimizedImageUrl(imageUrl, { 
    width, 
    height, 
    quality: priority ? 90 : 85 
  });

  return (
    <OptimizedImage
      src={optimizedSrc}
      alt={title}
      className={className}
      width={width}
      height={height}
      priority={priority}
      sizes={props.className?.includes('w-10') ? '40px' : 
             props.className?.includes('w-8') ? '32px' :
             `(max-width: 768px) ${Math.min(width, 300)}px, ${width}px`}
    />
  );
};

export default ProductImage;
