
import { Button } from '@/components/ui/button';
import { Plus, Save } from 'lucide-react';
import AddCategorySection from '@/components/admin/AddCategorySection';

type AdminCategoriesHeaderProps = {
  hasOrderChanged: boolean;
  onSaveOrder: () => void;
  updateCategoryOrderMutation: { isPending: boolean };
  showAddSection: boolean;
  setShowAddSection: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  fileForCategory: File | null;
  setFileForCategory: (file: File | null) => void;
  onAddCategory: (payload: { name: string; slug: string; imageUrl?: string }) => Promise<boolean>;
  addCategoryMutation: { isPending: boolean };
};

export default function AdminCategoriesHeader({
  hasOrderChanged,
  onSaveOrder,
  updateCategoryOrderMutation,
  showAddSection,
  setShowAddSection,
  newCategoryName,
  setNewCategoryName,
  fileForCategory,
  setFileForCategory,
  onAddCategory,
  addCategoryMutation,
}: AdminCategoriesHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-3xl font-bold tracking-tight">Управление категориями</h2>
      <div className="flex gap-2">
        {hasOrderChanged && (
          <Button onClick={onSaveOrder} variant="outline" disabled={updateCategoryOrderMutation.isPending}>
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
            onAddCategory={onAddCategory}
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
  );
}
