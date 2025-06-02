
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
  skipOptimization?: boolean;
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
  skipOptimization = false,
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

  console.log('OptimizedImage render:', { src, skipOptimization, isLoading, isError, isInView, imageLoaded, currentSrc });

  // If skipOptimization is true, return a simple img tag without any processing
  if (skipOptimization) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("object-cover", className)}
        width={width}
        height={height}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={onLoad}
        onError={onError}
        style={{ 
          width: width ? `${width}px` : undefined, 
          height: height ? `${height}px` : undefined 
        }}
      />
    );
  }

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

    // Handle incomplete file paths (just filename without domain)
    if (!src.startsWith('http') && !src.startsWith('/')) {
      console.log('Incomplete path detected, constructing full Supabase URL:', src);
      optimizedSrc = `https://xwylatyyhqyfwsxfwzmn.supabase.co/storage/v1/object/public/products/${src}`;
    }
    // Handle full Supabase URLs - apply optimization
    else if (src.includes('supabase.co/storage/v1/object/public/')) {
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
    }
    // Handle external URLs - use as-is without modification
    else if (src.startsWith('http')) {
      console.log('External URL detected, using as-is:', src);
      optimizedSrc = src;
    }
    // Handle relative paths
    else {
      console.log('Relative path detected, using as-is:', src);
      optimizedSrc = src;
    }

    setCurrentSrc(optimizedSrc);
    setImageLoaded(false);
    setIsError(false);
    
    // Set timeout only for Supabase URLs, not for external URLs
    const timeoutDuration = src.includes('supabase.co') ? 10000 : 15000;
    
    timeoutRef.current = setTimeout(() => {
      if (!imageLoaded) {
        console.warn(`Image loading timeout (${timeoutDuration}ms):`, optimizedSrc);
        setIsError(true);
        setIsLoading(false);
      }
    }, timeoutDuration);

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
    
    // If current src is not the fallback, try the fallback
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

  // Show error state with better styling
  if (isError) {
    return (
      <div className={cn("flex flex-col items-center justify-center bg-gray-50 border-2 border-gray-200 rounded-lg", className)}>
        <div className="text-gray-400 text-center p-4">
          <Image className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm text-gray-500">Изображение недоступно</div>
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
