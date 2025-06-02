
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
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
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
  }, [priority]);

  // Generate optimized image sources
  useEffect(() => {
    if (!isInView || !src) return;

    let optimizedSrc = src;

    // If it's a Supabase URL, add optimization parameters
    if (src.includes('supabase.co/storage/v1/object/public/')) {
      const url = new URL(src);
      url.searchParams.set('width', width?.toString() || '800');
      url.searchParams.set('height', height?.toString() || '600');
      url.searchParams.set('resize', 'cover');
      url.searchParams.set('format', 'webp');
      url.searchParams.set('quality', '85');
      optimizedSrc = url.toString();
    }

    setCurrentSrc(optimizedSrc);
  }, [isInView, src, width, height]);

  const handleLoad = () => {
    setIsLoading(false);
    setIsError(false);
    onLoad?.();
  };

  const handleError = () => {
    console.error(`Failed to load image: ${currentSrc}`);
    setIsLoading(false);
    setIsError(true);
    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    }
    onError?.();
  };

  // Show loading placeholder
  if (!isInView || isLoading) {
    return (
      <div 
        ref={imgRef}
        className={cn("flex items-center justify-center bg-gray-100 animate-pulse", className)}
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
  if (isError && currentSrc === fallbackSrc) {
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
