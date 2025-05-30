
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import ImageUploadField from "@/components/ImageUploadField";
import { toast } from "sonner";

type Props = {
  form: any;
  onAddCategory: (payload: { name: string; slug: string; imageUrl?: string }) => void;
  show: boolean;
  setShow: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  fileForCategory: string | null; // Changed to string for URL
  setFileForCategory: (f: string | null) => void;
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
      
      onAddCategory({
        name: newCategoryName,
        slug: newCategoryName.toLowerCase().replace(/\s+/g, "-"),
        imageUrl: fileForCategory || undefined
      });
      
      // Clear the URL after successful submission
      setFileForCategory(null);
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Не удалось создать категорию.");
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
        previewUrl={fileForCategory}
        onChange={(url) => setFileForCategory(url)}
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
