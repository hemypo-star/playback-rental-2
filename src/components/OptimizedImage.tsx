
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Image } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  sizes?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const OptimizedImage = ({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  sizes = '100vw',
  fallbackSrc = '/placeholder.svg',
  onLoad,
  onError,
}: OptimizedImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();
  const timeoutRef = useRef<NodeJS.Timeout>();

  console.log('OptimizedImage render:', { src, isLoading, isError, isInView, imageLoaded, currentSrc });

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          console.log('Image entered viewport:', src);
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, src]);

  // Generate optimized image sources
  useEffect(() => {
    if (!isInView || !src) return;

    let optimizedSrc = src;

    // Only apply Supabase optimization to Supabase URLs
    if (src.includes('supabase.co/storage/v1/object/public/')) {
      try {
        const url = new URL(src);
        if (width) url.searchParams.set('width', width.toString());
        if (height) url.searchParams.set('height', height.toString());
        url.searchParams.set('resize', 'cover');
        url.searchParams.set('format', 'webp');
        url.searchParams.set('quality', '85');
        optimizedSrc = url.toString();
        console.log('Applied Supabase optimization:', optimizedSrc);
      } catch (error) {
        console.error('Error applying Supabase optimization:', error);
        optimizedSrc = src;
      }
    } else {
      console.log('External URL detected, using original:', src);
      // For external URLs, use them as-is
      optimizedSrc = src;
    }

    setCurrentSrc(optimizedSrc);
    setImageLoaded(false);
    setIsError(false);
    
    // Set a timeout to handle stuck loading states
    timeoutRef.current = setTimeout(() => {
      if (!imageLoaded) {
        console.warn('Image loading timeout:', optimizedSrc);
        setIsError(true);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isInView, src, width, height, imageLoaded]);

  const handleLoad = () => {
    console.log('Image loaded successfully:', currentSrc);
    setIsLoading(false);
    setIsError(false);
    setImageLoaded(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onLoad?.();
  };

  const handleError = () => {
    console.error(`Failed to load image: ${currentSrc}`);
    setIsLoading(false);
    setImageLoaded(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (currentSrc !== fallbackSrc) {
      console.log('Trying fallback image:', fallbackSrc);
      setCurrentSrc(fallbackSrc);
      setIsError(false);
      setIsLoading(true);
    } else {
      setIsError(true);
    }
    onError?.();
  };

  // Show loading placeholder when not in view or when loading and no image has been loaded yet
  if (!isInView || (isLoading && !imageLoaded)) {
    return (
      <div 
        ref={imgRef}
        className={cn("flex items-center justify-center bg-gray-100", className)}
        style={{ width, height }}
      >
        {isInView && (
          <div className="text-gray-400 text-center p-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div className="text-sm">Загрузка...</div>
          </div>
        )}
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className={cn("flex items-center justify-center bg-gray-100", className)}>
        <div className="text-gray-400 text-center p-4">
          <Image className="h-8 w-8 mx-auto mb-2" />
          <div className="text-sm">Изображение недоступно</div>
        </div>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      className={cn("object-cover transition-opacity duration-300", className)}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      onLoad={handleLoad}
      onError={handleError}
      style={{ 
        width: width ? `${width}px` : undefined, 
        height: height ? `${height}px` : undefined 
      }}
    />
  );
};

export default OptimizedImage;
