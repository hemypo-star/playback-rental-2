
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImagePreview from "./ImagePreview";

type FileUploaderProps = {
  previewUrl: string | null;
  onChange: (file: File) => void;
  disabled?: boolean;
  onError?: (error: Error) => void;
};

export default function FileUploader({
  previewUrl,
  onChange,
  disabled = false,
  onError,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.error(`Failed to load image from URL: ${previewUrl}`);
    setImageError(true);
    if (onError) {
      onError(new Error(`Failed to load image from URL: ${previewUrl}`));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setIsLoading(true);
      
      try {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          throw new Error('Unsupported file type. Please use JPEG, PNG, GIF or WEBP.');
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('File size too large. Maximum size is 5MB.');
        }
        
        onChange(file);
        setImageError(false);
        
      } catch (error) {
        console.error('Error processing image file:', error);
        if (onError && error instanceof Error) {
          onError(error);
        }
        setImageError(true);
      } finally {
        setIsLoading(false);
        e.target.value = '';
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      <ImagePreview 
        previewUrl={previewUrl}
        imageError={imageError}
        handleImageError={handleImageError}
      />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isLoading}
      />
      
      <Button 
        type="button" 
        size="sm"
        className="flex items-center gap-1"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isLoading}
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
            <Upload className="h-4 w-4" />
            {previewUrl ? "Изменить" : "Загрузить"}
          </>
        )}
      </Button>
    </div>
  );
}
