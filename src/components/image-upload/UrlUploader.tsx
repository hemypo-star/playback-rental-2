
import { useState } from "react";
import { Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UrlUploaderProps = {
  onChange: (url: string) => void;
  disabled?: boolean;
  onError?: (error: Error) => void;
};

export default function UrlUploader({
  onChange,
  disabled = false,
  onError,
}: UrlUploaderProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageError = () => {
    setImageError(true);
    if (onError) {
      onError(new Error(`Failed to load image from URL: ${imageUrl}`));
    }
  };

  const handleUrlSubmit = () => {
    if (!imageUrl) return;
    
    setIsLoading(true);
    
    try {
      // Basic URL validation
      const urlRegex = /^(https?:\/\/)/i;
      if (!urlRegex.test(imageUrl)) {
        throw new Error('Please enter a valid URL starting with http:// or https://');
      }
      
      // Test that the image can be loaded
      const img = new window.Image();
      img.onload = () => {
        onChange(imageUrl);
        setPreviewUrl(imageUrl);
        setImageError(false);
        setIsLoading(false);
      };
      img.onerror = () => {
        if (onError) {
          onError(new Error('Invalid image URL or image could not be loaded'));
        }
        setImageError(true);
        setIsLoading(false);
      };
      img.src = imageUrl;
    } catch (error) {
      console.error('Error processing image URL:', error);
      if (onError && error instanceof Error) {
        onError(error);
      }
      setImageError(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="https://example.com/image.jpg"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          disabled={disabled || isLoading}
        />
        <Button 
          type="button"
          size="sm"
          onClick={handleUrlSubmit}
          disabled={disabled || isLoading || !imageUrl}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Загрузка...
            </span>
          ) : (
            <>
              <Link className="h-4 w-4 mr-2" />
              Применить
            </>
          )}
        </Button>
      </div>
      
      {imageUrl && previewUrl && !isLoading && (
        <div className="mt-2 w-full h-20 rounded border overflow-hidden">
          <img 
            src={imageUrl}
            alt="Preview" 
            className="w-full h-full object-contain" 
            onError={handleImageError}
          />
        </div>
      )}

      {imageError && (
        <p className="text-sm text-destructive mt-1">
          Не удалось загрузить изображение. Пожалуйста, проверьте URL-адрес.
        </p>
      )}
    </div>
  );
}
