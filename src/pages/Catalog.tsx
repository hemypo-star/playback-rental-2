
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon, Grid2X2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import ProductCard from '@/components/ProductCard';
import AnimatedTransition from '@/components/AnimatedTransition';
import * as supabaseService from '@/services/supabaseService';
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const Catalog = () => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => supabaseService.getCategories(),
  });
  
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => supabaseService.getProducts(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const searchInput = (document.getElementById('search-input') as HTMLInputElement)?.value;
    setSearch(searchInput || '');
  };
  
  const filteredProducts = products?.filter(product => {
    const matchesSearch = search ? 
      product.title.toLowerCase().includes(search.toLowerCase()) || 
      product.description.toLowerCase().includes(search.toLowerCase())
      : true;
      
    const matchesCategory = activeTab === 'all' || product.category === activeTab;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-r from-primary/90 to-primary py-20 px-4">
        <div className="container mx-auto">
          <h1 className="heading-1 text-white mb-6">Каталог техники</h1>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <form onSubmit={handleSubmit}>
                <Input
                  id="search-input"
                  placeholder="Поиск оборудования..."
                  className="pl-10 bg-white/90 border-0 h-12"
                  defaultValue={search}
                />
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Button type="submit" className="sr-only">Поиск</Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-12">
        <SidebarProvider defaultOpen>
          <div className="flex min-h-[500px] w-full">
            <Sidebar variant="inset" collapsible="none">
              <SidebarContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => setActiveTab('all')}
                      isActive={activeTab === 'all'}
                      className="w-full"
                    >
                      <Grid2X2Icon className="mr-2 h-4 w-4" />
                      <span>Все категории</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {categories?.map((category) => (
                    <SidebarMenuItem key={category.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(category.name)}
                        isActive={activeTab === category.name}
                        className="w-full"
                      >
                        <span>{category.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarContent>
            </Sidebar>

            <div className="flex-1 pl-6">
              <AnimatedTransition show={true} type="fade">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts?.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product}
                    />
                  ))}
                </div>
              </AnimatedTransition>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </div>
  );
};

export default Catalog;

