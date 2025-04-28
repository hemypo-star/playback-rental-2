
import { Upload, Image } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  label?: string;
  onChange: (file: File) => void;
  previewUrl?: string | null;
  disabled?: boolean;
  className?: string;
};

export default function ImageUploadField({ 
  label, 
  onChange, 
  previewUrl, 
  disabled, 
  className 
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {label && <span className="block text-sm">{label}</span>}
      <div className="flex items-center gap-3">
        {previewUrl && !imageError ? (
          <div 
            className="w-14 h-14 rounded bg-gray-200 bg-cover bg-center border flex items-center justify-center overflow-hidden"
          >
            <img 
              src={previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div className="w-14 h-14 flex items-center justify-center rounded border border-dashed bg-muted">
            <Image className="h-6 w-6 opacity-60" />
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) {
              onChange(e.target.files[0]);
              e.target.value = "";
              setImageError(false); // Reset error state on new file
            }
          }}
          disabled={disabled}
        />
        <Button 
          type="button" 
          size="sm"
          className="flex items-center gap-1"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <Upload className="h-4 w-4" />
          {previewUrl ? "Изменить" : "Загрузить"}
        </Button>
      </div>
    </div>
  );
}
