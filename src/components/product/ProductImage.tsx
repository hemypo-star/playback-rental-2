
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Product } from '@/types/product';

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

  return (
    <>
      {!isError ? (
        <img
          src={imageUrl}
          alt={title}
          className={cn("object-cover", className)}
          onError={handleError}
        />
      ) : (
        <div className={cn("flex items-center justify-center bg-gray-100", className)}>
          <div className="text-gray-400 text-center p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Изображение недоступно
          </div>
        </div>
      )}
    </>
  );
};

export default ProductImage;
