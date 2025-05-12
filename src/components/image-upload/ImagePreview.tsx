
import { AlertCircle, ImageIcon } from "lucide-react";

type ImagePreviewProps = {
  previewUrl: string | null;
  imageError: boolean;
  handleImageError: () => void;
  className?: string;
};

export default function ImagePreview({
  previewUrl,
  imageError,
  handleImageError,
  className = "",
}: ImagePreviewProps) {
  return (
    <>
      {previewUrl && !imageError ? (
        <div 
          className={`w-14 h-14 rounded bg-gray-200 bg-cover bg-center border flex items-center justify-center overflow-hidden ${className}`}
        >
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
        </div>
      ) : (
        <div className={`w-14 h-14 flex items-center justify-center rounded border border-dashed bg-muted ${className}`}>
          {imageError ? 
            <AlertCircle className="h-6 w-6 text-destructive" /> : 
            <ImageIcon className="h-6 w-6 opacity-60" />
          }
        </div>
      )}
    </>
  );
}
