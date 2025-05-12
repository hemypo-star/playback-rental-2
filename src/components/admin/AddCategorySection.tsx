
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import ImageUploadField from "@/components/ImageUploadField";
import { uploadCategoryImage } from "@/utils/imageUtils";
import { toast } from "sonner";

type Props = {
  form: any;
  onAddCategory: (payload: { name: string; slug: string; imageUrl?: string }) => void;
  show: boolean;
  setShow: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  fileForCategory: File | null;
  setFileForCategory: (f: File | null) => void;
  isPending: boolean;
};

export default function AddCategorySection({
  form,
  onAddCategory,
  show,
  setShow,
  newCategoryName,
  setNewCategoryName,
  fileForCategory,
  setFileForCategory,
  isPending,
}: Props) {
  const [isUploading, setIsUploading] = useState(false);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Название категории не может быть пустым");
      return;
    }
    
    try {
      setIsUploading(true);
      let imageUrl;
      
      if (fileForCategory) {
        // We pass File type here, which is what uploadCategoryImage expects
        imageUrl = await uploadCategoryImage(fileForCategory);
      }
      
      onAddCategory({
        name: newCategoryName,
        slug: newCategoryName.toLowerCase().replace(/\s+/g, "-"),
        imageUrl
      });
      
      // Clear the file after successful upload
      setFileForCategory(null);
    } catch (error) {
      console.error("Error uploading category image:", error);
      toast.error("Не удалось загрузить изображение. Категория будет создана без изображения.");
      
      onAddCategory({
        name: newCategoryName,
        slug: newCategoryName.toLowerCase().replace(/\s+/g, "-")
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <Input
        placeholder="Новая категория..."
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        className="flex-1"
        disabled={isPending || isUploading}
      />
      <ImageUploadField
        label=""
        previewUrl={fileForCategory ? URL.createObjectURL(fileForCategory) : null}
        onChange={f => {
          // Only accept File type for fileForCategory, not string
          if (f instanceof File) {
            setFileForCategory(f);
          } else {
            toast.error("URLs are not supported for categories. Please upload a file.");
          }
        }}
        disabled={isPending || isUploading}
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleAddCategory}
        size="sm"
        disabled={isPending || isUploading}
      >
        {isUploading ? "Загрузка..." : "Добавить"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShow(false)}
        disabled={isUploading}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
