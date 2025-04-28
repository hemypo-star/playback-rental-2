
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Product } from '@/types/product';
import { Image } from 'lucide-react';
import { getProductImageUrl } from '@/utils/imageUtils';

type ProductImageProps = {
  imageUrl: string;
  title: string;
  className?: string;
} | {
  product: Product;
  className?: string;
};

const ProductImage = (props: ProductImageProps) => {
  const [isError, setIsError] = useState(false);

  const handleError = () => {
    setIsError(true);
  };

  // Extract imageUrl and title from props based on whether we receive a product or direct values
  const imageUrl = 'product' in props ? props.product.imageUrl : props.imageUrl;
  const title = 'product' in props ? props.product.title : props.title;
  const className = props.className;

  const publicUrl = getProductImageUrl(imageUrl);

  return (
    <>
      {publicUrl && !isError ? (
        <img
          src={publicUrl}
          alt={title}
          className={cn("object-cover", className)}
          onError={handleError}
        />
      ) : (
        <div className={cn("flex items-center justify-center bg-gray-100", className)}>
          <div className="text-gray-400 text-center p-4">
            <Image className="h-12 w-12 mx-auto mb-2" />
            <div>Изображение недоступно</div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductImage;
