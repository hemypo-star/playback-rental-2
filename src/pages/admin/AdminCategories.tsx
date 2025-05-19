
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Pencil, Plus, Trash2, Upload, GripVertical, Save } from 'lucide-react';
import { Category } from '@/types/product';
import * as categoryService from '@/services/categoryService';
import AddCategorySection from '@/components/admin/AddCategorySection';
import { useCategoryManagement } from '@/hooks/useCategoryManagement';

const AdminCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [fileForCategory, setFileForCategory] = useState<File | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
  }>({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [categoriesOrder, setCategoriesOrder] = useState<Category[]>([]);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  const {
    handleAddCategory,
    handleUpdateCategoriesOrder,
    updateCategoryOrderMutation,
  } = useCategoryManagement();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
    onSuccess: (data) => {
      if (!hasOrderChanged) {
        setCategoriesOrder(data);
      }
    }
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (categoryData: Partial<Category>) => {
      let imageUrl = formData.imageUrl;
      
      if (uploadType === 'file' && imageFile) {
        imageUrl = await categoryService.uploadCategoryImage(imageFile);
      }
      
      return categoryService.addCategory({
        name: categoryData.name!,
        slug: categoryData.slug,
        description: categoryData.description,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория добавлена',
        description: 'Категория успешно добавлена.'
      });
      setOpenDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось добавить категорию: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (category: Partial<Category>) => {
      let imageUrl = formData.imageUrl;
      
      if (uploadType === 'file' && imageFile) {
        imageUrl = await categoryService.uploadCategoryImage(imageFile);
      }
      
      return categoryService.updateCategory(category.id!, {
        ...category,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория обновлена',
        description: 'Категория успешно обновлена.'
      });
      setOpenDialog(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось обновить категорию: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория удалена',
        description: 'Категория успешно удалена.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось удалить категорию: ${error}`,
        variant: 'destructive',
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    
    if (name === 'name' && (!formData.slug || formData.slug === '')) {
      setFormData((prev) => ({
        ...prev,
        slug: value.toLowerCase().replace(/\s+/g, '-'),
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const categoryData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      imageUrl: uploadType === 'url' ? formData.imageUrl : '',
    };
    
    if (editCategory) {
      updateCategoryMutation.mutate({ ...categoryData, id: editCategory.id });
    } else {
      addCategoryMutation.mutate(categoryData);
    }
  };

  const handleEdit = (category: Category) => {
    setEditCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug || '',
      description: category.description || '',
      imageUrl: category.imageUrl || '',
    });
    setImagePreview(category.imageUrl || '');
    setUploadType(category.imageUrl?.startsWith('http') ? 'url' : 'file');
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту категорию?')) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
    });
    setImageFile(null);
    setImagePreview('');
    setUploadType('file');
    setNewCategoryName('');
    setFileForCategory(null);
  };

  const handleAddNewCategory = async ({ name, slug, imageUrl }: { name: string; slug: string; imageUrl?: string }) => {
    try {
      if (!name.trim()) {
        toast({
          title: "Ошибка",
          description: "Название категории не может быть пустым",
          variant: "destructive",
        });
        return false;
      }
      
      let finalImageUrl = imageUrl || '';
      
      if (fileForCategory) {
        try {
          finalImageUrl = await categoryService.uploadCategoryImage(fileForCategory);
          console.log("Uploaded image URL:", finalImageUrl);
        } catch (error) {
          console.error("Error uploading image:", error);
          toast({
            title: "Ошибка",
            description: "Не удалось загрузить изображение",
            variant: "destructive",
          });
        }
      }
      
      await categoryService.addCategory({
        name,
        slug,
        description: '',
        imageUrl: finalImageUrl,
      });
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({
        title: 'Категория добавлена',
        description: 'Категория успешно добавлена.'
      });
      
      setNewCategoryName('');
      setFileForCategory(null);
      setShowAddSection(false);
      
      return true;
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Ошибка",
        description: `Не удалось добавить категорию: ${error}`,
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...categoriesOrder];
    const draggedItem = newOrder[draggedIndex];
    
    // Remove the item from its original position
    newOrder.splice(draggedIndex, 1);
    // Insert it at the new position
    newOrder.splice(index, 0, draggedItem);
    
    setCategoriesOrder(newOrder);
    setDraggedIndex(index);
    setHasOrderChanged(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedIndex(null);
  };

  const handleSaveOrder = () => {
    handleUpdateCategoriesOrder(categoriesOrder);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Управление категориями</h2>
        <div className="flex gap-2">
          {hasOrderChanged && (
            <Button onClick={handleSaveOrder} variant="outline" disabled={updateCategoryOrderMutation.isPending}>
              {updateCategoryOrderMutation.isPending ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Сохранение...
                </span>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Сохранить порядок
                </>
              )}
            </Button>
          )}
          {showAddSection ? (
            <AddCategorySection 
              form={{}}
              onAddCategory={handleAddNewCategory}
              show={showAddSection}
              setShow={setShowAddSection}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              fileForCategory={fileForCategory}
              setFileForCategory={setFileForCategory}
              isPending={addCategoryMutation.isPending}
            />
          ) : (
            <Button onClick={() => setShowAddSection(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить категорию
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <Card key={idx} className="animate-pulse">
              <CardHeader className="bg-muted h-24"></CardHeader>
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {categoriesOrder.map((category, index) => (
            <div 
              key={category.id}
              draggable={true}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`border rounded-md overflow-hidden ${isDragging && draggedIndex === index ? 'opacity-50' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <div className="flex items-center p-4">
                <div className="mr-4 text-muted-foreground cursor-grab">
                  <GripVertical className="h-6 w-6" />
                </div>
                <div className="h-12 w-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {category.imageUrl ? (
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null; // Prevent infinite loop
                        target.src = 'https://via.placeholder.com/48?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-primary/10">
                      <span className="text-xs text-primary">Нет фото</span>
                    </div>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="font-medium">{category.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {category.description || 'Нет описания'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editCategory ? 'Редактировать категорию' : 'Добавить категорию'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название категории</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (для URL)</Label>
              <Input
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Изображение категории</Label>
              <div className="flex space-x-4 mb-2">
                <Button
                  type="button"
                  variant={uploadType === 'file' ? 'default' : 'outline'}
                  onClick={() => setUploadType('file')}
                >
                  Загрузить файл
                </Button>
                <Button
                  type="button"
                  variant={uploadType === 'url' ? 'default' : 'outline'}
                  onClick={() => setUploadType('url')}
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
                        onChange={handleFileChange}
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
                    onChange={handleInputChange}
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
                onClick={() => {
                  setOpenDialog(false);
                  resetForm();
                }}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={addCategoryMutation.isPending || updateCategoryMutation.isPending}>
                {editCategory ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
