
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getCategories } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRightIcon, Layers } from 'lucide-react';

const categoryImages: Record<string, string> = {
  'Компьютеры': 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
  'Ноутбуки': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  'Планшеты': 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&w=800&q=80',
  'Мониторы': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
  'default': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80'
};

export const CategoriesSection = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  return (
    <section className="py-12 bg-gradient-to-b from-secondary/30 to-background">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="chip mb-2 bg-primary/10 text-primary">Категории</span>
            <h2 className="heading-2">Оборудование для любых нужд</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 rounded-t-xl bg-muted"></div>
                <div className="h-24 rounded-b-xl bg-white p-4">
                  <div className="h-4 w-2/3 bg-muted rounded mb-2"></div>
                  <div className="h-3 w-full bg-muted/50 rounded"></div>
                </div>
              </div>
            ))
          ) : (
            categories?.map((category) => (
              <Link 
                key={category.id} 
                to={`/catalog?category=${category.name}`}
                className="group block"
              >
                <Card className="overflow-hidden border-0 transition-all duration-300 group-hover:shadow-lg">
                  <div className="relative h-48 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                    <img 
                      src={categoryImages[category.name] || categoryImages.default} 
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <CardContent className="relative bg-white p-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-4 w-4 text-primary" />
                        <h3 className="text-xl font-medium">{category.name}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                        {category.description}
                      </p>
                      <Button 
                        variant="ghost" 
                        className="w-fit group/btn p-0 h-auto hover:bg-transparent text-primary"
                      >
                        Смотреть
                        <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
