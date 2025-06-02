
import OptimizedImage from '@/components/OptimizedImage';
import { Product } from '@/types/product';
import { validateAndFixImageUrl } from '@/utils/optimizedImageUtils';
import { useEffect, useState } from 'react';

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
  
  const [validatedImageUrl, setValidatedImageUrl] = useState<string>(imageUrl);

  console.log('ProductImage render:', { imageUrl, title, width, height, priority });

  // Validate and fix the image URL on component mount
  useEffect(() => {
    const validateUrl = async () => {
      const validUrl = await validateAndFixImageUrl(imageUrl);
      setValidatedImageUrl(validUrl);
    };
    
    validateUrl();
  }, [imageUrl]);

  if (!validatedImageUrl) {
    console.log('No valid image URL, using placeholder');
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

  // Pass the validated URL directly to OptimizedImage
  return (
    <OptimizedImage
      src={validatedImageUrl}
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
