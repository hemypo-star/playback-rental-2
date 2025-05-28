
import { Grid2X2Icon, ChevronDown } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Category } from '@/types/product';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface CategorySidebarProps {
  categories?: Category[];
  activeTab: string;
  onCategoryChange: (categoryId: string) => void; // Changed to accept categoryId instead of category name
}

const CategorySidebar = ({ categories = [], activeTab, onCategoryChange }: CategorySidebarProps) => {
  const isMobile = useIsMobile();
  
  // Method to handle category selection that also scrolls to top
  const handleCategoryChange = (categoryId: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onCategoryChange(categoryId);
  };

  // For mobile view, show a Select dropdown instead of sidebar
  if (isMobile) {
    return (
      <div className="w-full">
        <Select value={activeTab} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите категорию" />
          </SelectTrigger>
          <SelectContent className="w-full" position="popper" sideOffset={4} align="start" alignOffset={0}>
            <SelectItem value="all">
              <div className="flex items-center">
                <Grid2X2Icon className="mr-2 h-4 w-4" />
                <span>Все категории</span>
              </div>
            </SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.category_id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // For desktop view, create a simple sidebar component that doesn't use useSidebar hook directly
  return (
    <div className="w-1/4 min-w-[240px] pr-6">
      <div className="sticky top-4">
        <h3 className="font-medium text-sm uppercase text-muted-foreground mb-3 px-3">Категории</h3>
        <ul className="flex flex-col gap-1">
          <li>
            <button
              onClick={() => handleCategoryChange('all')}
              className={cn(
                "w-full text-left flex items-center px-3 py-2 rounded-md font-medium",
                activeTab === 'all' ? "text-[#ea384c] font-semibold bg-muted/50" : "hover:bg-muted"
              )}
            >
              <Grid2X2Icon className={cn(
                "mr-2 h-4 w-4", 
                activeTab === 'all' && "text-[#ea384c]"
              )} />
              <span>Все категории</span>
            </button>
          </li>
          
          {categories?.map((category) => (
            <li key={category.id}>
              <button
                onClick={() => handleCategoryChange(category.category_id.toString())}
                className={cn(
                  "w-full text-left flex items-center px-3 py-2 rounded-md",
                  activeTab === category.category_id.toString() ? "text-[#ea384c] font-semibold bg-muted/50" : "hover:bg-muted"
                )}
              >
                <span>{category.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CategorySidebar;
