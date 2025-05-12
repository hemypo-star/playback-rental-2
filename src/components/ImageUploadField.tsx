
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploader from "./image-upload/FileUploader";
import UrlUploader from "./image-upload/UrlUploader";

type Props = {
  label?: string;
  onChange: (file: File | string) => void;
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
  const [imageError, setImageError] = useState(false);
  const [uploadType, setUploadType] = useState<'file' | 'link'>('file');

  // Reset error state when previewUrl changes
  useEffect(() => {
    if (previewUrl) {
      setImageError(false);
    }
  }, [previewUrl]);

  const handleFileSelected = (file: File) => {
    onChange(file);
  };

  const handleUrlSelected = (url: string) => {
    onChange(url);
  };

  const handleError = (error: Error) => {
    setImageError(true);
    if (onError) {
      onError(error);
    }
  };

  return (
    <div className={`space-y-2 ${className || ''}`}>
      {label && <span className="block text-sm">{label}</span>}
      
      <Tabs defaultValue="file" onValueChange={(value) => setUploadType(value as 'file' | 'link')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Файл</TabsTrigger>
          <TabsTrigger value="link">Ссылка</TabsTrigger>
        </TabsList>
        
        <TabsContent value="file" className="space-y-4 pt-4">
          <FileUploader
            previewUrl={previewUrl}
            onChange={handleFileSelected}
            disabled={disabled}
            onError={handleError}
          />
        </TabsContent>
        
        <TabsContent value="link" className="space-y-4 pt-4">
          <UrlUploader
            onChange={handleUrlSelected}
            disabled={disabled}
            onError={handleError}
          />
        </TabsContent>
      </Tabs>
      
      {imageError && (
        <p className="text-sm text-destructive mt-1">
          Не удалось загрузить изображение. Пожалуйста, попробуйте другой файл или ссылку.
        </p>
      )}
    </div>
  );
}
