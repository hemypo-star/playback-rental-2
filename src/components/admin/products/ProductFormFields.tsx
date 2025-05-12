
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import ImageUploadField from "@/components/ImageUploadField";
import CategoryField from "./CategoryField";
import { UseFormReturn } from "react-hook-form";
import { Category } from "@/types/product";

type ProductFormFieldsProps = {
  form: UseFormReturn<any>;
  categories: Category[];
  isSubmitting: boolean;
  isCheckingStorage: boolean;
  showCategoryInput: boolean;
  setShowCategoryInput: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  handleNewCategory: () => Promise<void>;
  isAddingCategory: boolean;
  setImageForProduct: (file: File | string | null) => void;
  imageForProduct: File | string | null;
};

export default function ProductFormFields({
  form,
  categories,
  isSubmitting,
  isCheckingStorage,
  showCategoryInput,
  setShowCategoryInput,
  newCategoryName,
  setNewCategoryName,
  handleNewCategory,
  isAddingCategory,
  setImageForProduct,
  imageForProduct
}: ProductFormFieldsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Название</FormLabel>
            <FormControl>
              <Input {...field} />
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
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Цена (₽)</FormLabel>
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

      <CategoryField 
        form={form}
        categories={categories}
        showCategoryInput={showCategoryInput}
        setShowCategoryInput={setShowCategoryInput}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        handleNewCategory={handleNewCategory}
        isAddingCategory={isAddingCategory}
      />

      <FormField
        control={form.control}
        name="imageUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Изображение</FormLabel>
            <FormControl>
              <div>
                <ImageUploadField
                  onChange={(file) => {
                    console.log("New image selected:", typeof file === 'string' ? 'URL: ' + file : 'File: ' + file.name);
                    setImageForProduct(file);
                  }}
                  previewUrl={
                    typeof imageForProduct === 'string' ? imageForProduct :
                    imageForProduct ? URL.createObjectURL(imageForProduct) :
                    (field.value || null)
                  }
                  disabled={isSubmitting || isCheckingStorage}
                />
                <Input 
                  type="hidden"
                  {...field}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="available"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Доступность</FormLabel>
              <div className="text-sm text-muted-foreground">
                Товар доступен для бронирования
              </div>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );
}
