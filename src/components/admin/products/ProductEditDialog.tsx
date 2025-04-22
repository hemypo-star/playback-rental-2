
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ImageUploadField from "@/components/ImageUploadField";
import AddCategorySection from "@/components/admin/AddCategorySection";
import { Plus } from "lucide-react";
import { Product, Category } from "@/types/product";

type ProductEditDialogProps = {
  open: boolean;
  setOpen: (v: boolean) => void;
  editProduct: Product | null;
  form: any;
  categories: Category[];
  showCategoryInput: boolean;
  setShowCategoryInput: (v: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  fileForProduct: File | null;
  setFileForProduct: (f: File | null) => void;
  fileForCategory: File | null;
  setFileForCategory: (f: File | null) => void;
  addCategoryMutation: any;
  onSubmit: (values: any) => void;
  handleAddCategory: (payload: { name: string; imageUrl?: string; slug: string }) => void;
  createPending: boolean;
  updatePending: boolean;
};

export default function ProductEditDialog({
  open, setOpen, editProduct, form, categories, showCategoryInput, setShowCategoryInput,
  newCategoryName, setNewCategoryName,
  fileForProduct, setFileForProduct, fileForCategory, setFileForCategory,
  addCategoryMutation, onSubmit, handleAddCategory,
  createPending, updatePending,
}: ProductEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Добавить товар
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editProduct ? 'Редактировать товар' : 'Добавить новый товар'}
          </DialogTitle>
          <DialogDescription>
            {editProduct
              ? 'Измените информацию о товаре и нажмите Сохранить'
              : 'Заполните информацию о новом товаре для добавления в каталог'
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Категория</FormLabel>
                  {showCategoryInput ? (
                    <AddCategorySection
                      form={form}
                      onAddCategory={handleAddCategory}
                      show={showCategoryInput}
                      setShow={setShowCategoryInput}
                      newCategoryName={newCategoryName}
                      setNewCategoryName={setNewCategoryName}
                      fileForCategory={fileForCategory}
                      setFileForCategory={setFileForCategory}
                      isPending={addCategoryMutation.isPending}
                    />
                  ) : (
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.name}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowCategoryInput(true)}
                        size="sm"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Sony Alpha A7 III" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Полнокадровая беззеркальная камера..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена за сутки (₽)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Количество</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Изображение товара</FormLabel>
                  <FormControl>
                    <ImageUploadField
                      label=""
                      previewUrl={fileForProduct ? URL.createObjectURL(fileForProduct) : field.value || null}
                      onChange={f => setFileForProduct(f)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="available"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Доступно для бронирования
                  </FormLabel>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createPending || updatePending}>
                {createPending || updatePending
                  ? 'Сохранение...'
                  : editProduct ? 'Сохранить изменения' : 'Добавить товар'
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
