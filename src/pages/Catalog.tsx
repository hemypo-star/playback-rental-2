
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon, Grid2X2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ProductCard from '@/components/ProductCard';
import AnimatedTransition from '@/components/AnimatedTransition';
import * as supabaseService from '@/services/supabaseService';

const Catalog = () => {
  const [search, setSearch] = useState('');
  
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
    if (search) {
      const searchLower = search.toLowerCase();
      return product.title.toLowerCase().includes(searchLower) || 
             product.description.toLowerCase().includes(searchLower);
    }
    return true;
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
        <Tabs defaultValue="all" className="space-y-8">
          <TabsList className="inline-flex h-12 items-center justify-start space-x-2 rounded-md bg-muted p-1 text-muted-foreground w-full overflow-x-auto">
            <TabsTrigger 
              value="all" 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-6 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm hover:bg-accent/80"
            >
              <Grid2X2Icon className="mr-2 h-4 w-4" />
              Все категории
            </TabsTrigger>
            
            {categories?.map((category) => (
              <TabsTrigger 
                key={category.id}
                value={category.name}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-6 py-1.5 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-sm hover:bg-accent/80"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <AnimatedTransition show={true} type="fade">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts?.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product}
                  />
                ))}
              </div>
            </AnimatedTransition>
          </TabsContent>

          {categories?.map((category) => (
            <TabsContent key={category.id} value={category.name} className="mt-6">
              <AnimatedTransition show={true} type="fade">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts
                    ?.filter(product => product.category === category.name)
                    .map((product) => (
                      <ProductCard 
                        key={product.id} 
                        product={product}
                      />
                    ))}
                </div>
              </AnimatedTransition>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Catalog;
