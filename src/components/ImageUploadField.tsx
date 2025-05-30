
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ImagePreview from "./image-upload/ImagePreview";

type Props = {
  label?: string;
  onChange: (url: string) => void;
  previewUrl?: string | null;
  disabled?: boolean;
  className?: string;
  onError?: (error: Error) => void;
};

export default function ImageUploadField({ 
  label, 
  onChange, 
  previewUrl, 
  disabled, 
  className,
  onError
}: Props) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageError, setImageError] = useState(false);

  // Reset error state when previewUrl changes
  useEffect(() => {
    if (previewUrl) {
      setImageError(false);
      setImageUrl(previewUrl);
    }
  }, [previewUrl]);

  const handleImageError = () => {
    setImageError(true);
    if (onError) {
      onError(new Error(`Failed to load image from URL: ${imageUrl}`));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setImageUrl(url);
    
    if (url) {
      // Basic URL validation
      const urlRegex = /^https?:\/\/.+/i;
      if (urlRegex.test(url)) {
        onChange(url);
        setImageError(false);
      } else {
        setImageError(true);
        if (onError) {
          onError(new Error('Please enter a valid URL starting with http:// or https://'));
        }
      }
    } else {
      onChange('');
      setImageError(false);
    }
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      <div className="flex items-center gap-3">
        <ImagePreview 
          previewUrl={previewUrl}
          imageError={imageError}
          handleImageError={handleImageError}
        />
        
        <div className="flex-1">
          <Input
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={handleUrlChange}
            disabled={disabled}
          />
        </div>
      </div>
      
      {imageError && (
        <p className="text-sm text-destructive mt-1">
          Не удалось загрузить изображение. Пожалуйста, проверьте URL-адрес.
        </p>
      )}
    </div>
  );
}
