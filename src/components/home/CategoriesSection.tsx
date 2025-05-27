
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getCategories } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRightIcon, Layers, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const categoryImages: Record<string, string> = {
  'Компьютеры': 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80',
  'Ноутбуки': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  'Планшеты': 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?auto=format&fit=crop&w=800&q=80',
  'Мониторы': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
  'default': 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80'
};

export const CategoriesSection = () => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
  
  const visibleCategories = showAll 
    ? categories 
    : categories?.slice(0, 8);
    
  const handleCategoryClick = (categoryName: string) => {
    navigate('/catalog', { 
      state: { 
        activeCategory: categoryName,
        scrollTop: true 
      } 
    });
  };
  
  const handleShowAllClick = () => {
    if (categories && categories.length > 8) {
      if (!showAll) {
        setShowAll(true);
      } else {
        navigate('/catalog', { state: { scrollTop: true } });
      }
    } else {
      navigate('/catalog', { state: { scrollTop: true } });
    }
  };

  return (
    <section className="py-20">
      <div className="container px-4 mx-auto">
        <div className="text-center md:text-left mb-6">
          <span className="chip mb-3">Наше оборудование</span>
          <h2 className="heading-2">Категории оборудования</h2>
        </div>
        
        <p className="body-text max-w-2xl mx-auto md:mx-0 mb-8">
          Выберите из нашего широкого ассортимента профессионального оборудования для вашего следующего проекта
        </p>
        
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
            visibleCategories?.map((category) => (
              <Card 
                key={category.id} 
                className="overflow-hidden border-0 transition-all duration-300 hover:shadow-lg cursor-pointer"
                onClick={() => handleCategoryClick(category.name)}
              >
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                  <img 
                    src={category.imageUrl || categoryImages[category.name] || categoryImages.default} 
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      // If the image fails to load, use the default image
                      const target = e.target as HTMLImageElement;
                      target.onerror = null; // Prevent infinite loop
                      target.src = categoryImages.default;
                    }}
                  />
                </div>
                <CardContent className="relative bg-white p-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Layers className="h-4 w-4 text-primary" />
                      <h3 className="text-xl font-medium">{category.name}</h3>
                    </div>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                      {category.description || 'Нет описания'}
                    </p>
                    <div 
                      className="w-fit group/btn p-0 h-auto text-primary flex items-center"
                    >
                      Смотреть
                      <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        <div className="mt-8 flex justify-center">
          <Button 
            onClick={handleShowAllClick}
            className="w-full sm:w-auto"
          >
            Посмотреть все
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};
