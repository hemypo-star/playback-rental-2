
import { Grid2X2Icon } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Category } from '@/types/product';

interface CategorySidebarProps {
  categories?: Category[];
  activeTab: string;
  onCategoryChange: (category: string) => void;
}

const CategorySidebar = ({ categories = [], activeTab, onCategoryChange }: CategorySidebarProps) => {
  // Method to handle category selection that also scrolls to top
  const handleCategoryChange = (category: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onCategoryChange(category);
  };

  return (
    <Sidebar variant="inset" collapsible="none" className="w-1/4 min-w-[240px] pr-6">
      <SidebarContent>
        <h3 className="font-medium text-sm uppercase text-muted-foreground mb-3 px-3">Категории</h3>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => handleCategoryChange('all')}
              isActive={activeTab === 'all'}
              className="w-full text-left justify-start font-medium"
            >
              <Grid2X2Icon className="mr-2 h-4 w-4" />
              <span>Все категории</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {categories?.map((category) => (
            <SidebarMenuItem key={category.id}>
              <SidebarMenuButton
                onClick={() => handleCategoryChange(category.name)}
                isActive={activeTab === category.name}
                className="w-full text-left justify-start"
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
