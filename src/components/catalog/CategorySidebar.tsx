
import { Grid2X2Icon, ChevronDown } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider
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
  onCategoryChange: (category: string) => void;
}

const CategorySidebar = ({ categories = [], activeTab, onCategoryChange }: CategorySidebarProps) => {
  const isMobile = useIsMobile();
  
  // Method to handle category selection that also scrolls to top
  const handleCategoryChange = (category: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onCategoryChange(category);
  };

  // For mobile view, show a Select dropdown instead of sidebar
  if (isMobile) {
    return (
      <div className="w-full">
        <Select value={activeTab} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Выберите категорию" />
          </SelectTrigger>
          <SelectContent className="w-full">
            <SelectItem value="all">
              <div className="flex items-center">
                <Grid2X2Icon className="mr-2 h-4 w-4" />
                <span>Все категории</span>
              </div>
            </SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.name}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // For desktop view, we're now creating a sidebar without SidebarProvider
  // as the Provider should be in the parent component
  return (
    <Sidebar 
      variant="inset" 
      collapsible={isMobile ? "offcanvas" : "none"} 
      className="w-1/4 min-w-[240px] pr-6"
    >
      <SidebarContent>
        <h3 className="font-medium text-sm uppercase text-muted-foreground mb-3 px-3">Категории</h3>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => handleCategoryChange('all')}
              isActive={activeTab === 'all'}
              className={cn(
                "w-full text-left justify-start font-medium",
                activeTab === 'all' && "text-[#ea384c] font-semibold"
              )}
            >
              <Grid2X2Icon className={cn(
                "mr-2 h-4 w-4", 
                activeTab === 'all' && "text-[#ea384c]"
              )} />
              <span>Все категории</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {categories?.map((category) => (
            <SidebarMenuItem key={category.id}>
              <SidebarMenuButton
                onClick={() => handleCategoryChange(category.name)}
                isActive={activeTab === category.name}
                className={cn(
                  "w-full text-left justify-start",
                  activeTab === category.name && "text-[#ea384c] font-semibold"
                )}
              >
                <span>{category.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default CategorySidebar;
