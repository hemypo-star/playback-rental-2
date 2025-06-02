
import OptimizedImage from '@/components/OptimizedImage';
import { Product } from '@/types/product';

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

  console.log('ProductImage render:', { imageUrl, title, width, height, priority });

  if (!imageUrl) {
    console.log('No image URL provided, using placeholder');
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

  // Pass the original URL directly to OptimizedImage - let it handle optimization
  return (
    <OptimizedImage
      src={imageUrl}
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
