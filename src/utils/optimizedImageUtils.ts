
import { supabase } from '@/integrations/supabase/client';

// Image cache for storing processed URLs
const imageCache = new Map<string, string>();
const prefetchCache = new Set<string>();

/**
 * Enhanced image URL processing with caching and optimization
 */
export const getOptimizedImageUrl = (
  imageUrl: string, 
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  } = {}
): string => {
  if (!imageUrl) return '/placeholder.svg';
  
  const { width = 800, height = 600, quality = 85, format = 'webp' } = options;
  const cacheKey = `${imageUrl}_${width}_${height}_${quality}_${format}`;
  
  console.log('getOptimizedImageUrl called:', { imageUrl, options });
  
  // Return cached URL if available
  if (imageCache.has(cacheKey)) {
    const cachedUrl = imageCache.get(cacheKey)!;
    console.log('Returning cached URL:', cachedUrl);
    return cachedUrl;
  }
  
  let optimizedUrl = imageUrl;
  
  // Handle external URLs - only apply optimization to Supabase URLs
  if (imageUrl.startsWith('http')) {
    // Only optimize Supabase URLs, leave external URLs as-is
    if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
      try {
        const url = new URL(imageUrl);
        url.searchParams.set('width', width.toString());
        url.searchParams.set('height', height.toString());
        url.searchParams.set('resize', 'cover');
        url.searchParams.set('format', format);
        url.searchParams.set('quality', quality.toString());
        optimizedUrl = url.toString();
        console.log('Applied Supabase optimization to:', optimizedUrl);
      } catch (error) {
        console.error('Error optimizing Supabase URL:', error);
      }
    } else {
      console.log('External URL detected, using original:', imageUrl);
      // For external URLs (like UserAPI), use them as-is
      optimizedUrl = imageUrl;
    }
    
    imageCache.set(cacheKey, optimizedUrl);
    return optimizedUrl;
  }
  
  // Handle Supabase storage paths
  try {
    const fullUrl = `https://xwylatyyhqyfwsxfwzmn.supabase.co/storage/v1/object/public/products/${imageUrl}`;
    const url = new URL(fullUrl);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('height', height.toString());
    url.searchParams.set('resize', 'cover');
    url.searchParams.set('format', format);
    url.searchParams.set('quality', quality.toString());
    optimizedUrl = url.toString();
    console.log('Created optimized Supabase URL from path:', optimizedUrl);
  } catch (error) {
    console.error('Error creating optimized URL:', error);
    optimizedUrl = `https://xwylatyyhqyfwsxfwzmn.supabase.co/storage/v1/object/public/products/${imageUrl}`;
  }
  
  imageCache.set(cacheKey, optimizedUrl);
  return optimizedUrl;
};

/**
 * Prefetch critical images for better performance
 */
export const prefetchImage = (url: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (prefetchCache.has(url)) {
      resolve();
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      prefetchCache.add(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Prefetch multiple images with priority
 */
export const prefetchImages = async (urls: string[], priority: boolean = false): Promise<void> => {
  const prefetchPromises = urls.map(url => {
    if (priority) {
      return prefetchImage(url);
    } else {
      // Use requestIdleCallback for non-priority images
      return new Promise<void>((resolve) => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            prefetchImage(url).then(resolve).catch(resolve);
          });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            prefetchImage(url).then(resolve).catch(resolve);
          }, 100);
        }
      });
    }
  });
  
  await Promise.allSettled(prefetchPromises);
};

/**
 * Generate responsive image sizes
 */
export const generateResponsiveSizes = (sizes: { mobile?: number; tablet?: number; desktop?: number }) => {
  const { mobile = 400, tablet = 600, desktop = 800 } = sizes;
  return `(max-width: 768px) ${mobile}px, (max-width: 1024px) ${tablet}px, ${desktop}px`;
};

/**
 * Clear image cache (useful for memory management)
 */
export const clearImageCache = (): void => {
  imageCache.clear();
  prefetchCache.clear();
};

/**
 * Enhanced version of the original function with backward compatibility
 */
export const getProductImageUrl = (imageUrl: string): string => {
  return getOptimizedImageUrl(imageUrl, { width: 400, height: 300 });
};

/**
 * Upload product image with optimization
 */
export const uploadProductImage = async (imageFile: File | string, productId?: string): Promise<string> => {
  if (typeof imageFile === 'string') {
    if (imageFile.startsWith('http')) {
      return imageFile;
    }
    return imageFile;
  }
  
  const timestamp = new Date().getTime();
  const fileName = `${productId ? `${productId}_` : ''}${timestamp}_${imageFile.name.replace(/\s+/g, '_')}`;
  const filePath = `${fileName}`;
  
  try {
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Error uploading product image:', uploadError);
      throw new Error(`Error uploading product image: ${uploadError.message}`);
    }
    
    return filePath;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    throw error;
  }
};
