
import { useState, useEffect } from 'react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Extract imageUrl and title from props based on whether we receive a product or direct values
  const rawImageUrl = 'product' in props ? props.product.imageUrl : props.imageUrl;
  const title = 'product' in props ? props.product.title : props.title;
  const className = props.className;

  // Get the public URL for the image
  useEffect(() => {
    if (!rawImageUrl) {
      console.log('ProductImage: No raw image URL provided');
      setIsLoading(false);
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      // Get public URL directly from Supabase storage
      const publicUrl = getProductImageUrl(rawImageUrl);
      console.log(`ProductImage: Converting raw URL "${rawImageUrl}" to public URL "${publicUrl}"`);
      setImageUrl(publicUrl);
      
      // If publicUrl is null, set error state
      if (!publicUrl) {
        setIsError(true);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error(`Error getting product image URL for "${rawImageUrl}":`, error);
      setIsLoading(false);
      setIsError(true);
    }
  }, [rawImageUrl]);

  const handleError = () => {
    console.error(`Image failed to load: ${imageUrl} (raw: ${rawImageUrl})`);
    setIsError(true);
    setIsLoading(false);
  };

  return (
    <>
      {isLoading ? (
        <div className={cn("flex items-center justify-center bg-gray-100", className)}>
          <div className="text-gray-400 text-center p-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div>Загрузка...</div>
          </div>
        </div>
      ) : imageUrl && !isError ? (
        <img
          src={imageUrl}
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
