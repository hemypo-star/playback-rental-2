
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { Category } from '@/types/product';

type CategoryEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCategory: Category | null;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  uploadType: 'file' | 'url';
  onUploadTypeChange: (type: 'file' | 'url') => void;
  imagePreview: string;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
};

export default function CategoryEditDialog({
  open,
  onOpenChange,
  editCategory,
  onSubmit,
  formData,
  onInputChange,
  uploadType,
  onUploadTypeChange,
  imagePreview,
  onFileChange,
  onCancel,
  isSubmitting,
}: CategoryEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editCategory ? 'Редактировать категорию' : 'Добавить категорию'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название категории</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={onInputChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (для URL)</Label>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={onInputChange}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={onInputChange}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Изображение категории</Label>
            <div className="flex space-x-4 mb-2">
              <Button
                type="button"
                variant={uploadType === 'file' ? 'default' : 'outline'}
                onClick={() => onUploadTypeChange('file')}
              >
                Загрузить файл
              </Button>
              <Button
                type="button"
                variant={uploadType === 'url' ? 'default' : 'outline'}
                onClick={() => onUploadTypeChange('url')}
              >
                Указать URL
              </Button>
            </div>
            
            {uploadType === 'file' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="dropzone-file"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                  >
                    {imagePreview ? (
                      <div className="relative w-full h-full">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="object-cover w-full h-full rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG до 5MB</p>
                      </div>
                    )}
                    <input
                      id="dropzone-file"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={onFileChange}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  id="imageUrl"
                  name="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={onInputChange}
                />
                {formData.imageUrl && (
                  <div className="relative w-full h-32 mt-2">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="object-cover w-full h-full rounded-lg"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x150?text=Invalid+Image+URL';
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {editCategory ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
