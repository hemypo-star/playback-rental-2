
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { Category } from "@/types/product";
import ImageUploadField from "@/components/ImageUploadField";

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
  return (
    <div className="flex gap-2 items-end">
      <Input
        placeholder="Новая категория..."
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        className="flex-1"
        disabled={isPending}
      />
      <ImageUploadField
        label=""
        previewUrl={fileForCategory ? URL.createObjectURL(fileForCategory) : null}
        onChange={f => setFileForCategory(f)}
        disabled={isPending}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onAddCategory({
            name: newCategoryName,
            slug: newCategoryName.toLowerCase().replace(/\s+/g, "-"),
          })
        }
        size="sm"
        disabled={isPending}
      >
        Добавить
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setShow(false)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
