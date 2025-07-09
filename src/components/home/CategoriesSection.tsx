
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getCategories } from '@/services/categoryService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRightIcon, ChevronRight } from 'lucide-react';

const categoryImages: Record<string, string> = {
  'Компьютеры': '',
  'Ноутбуки': '',
  'Планшеты': '',
  'Мониторы': '',
  'default': ''
};

export const CategoriesSection = () => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });
  
  const visibleCategories = showAll ? categories : categories?.slice(0, 8);
  
  const handleCategoryClick = (categoryId: number) => {
    navigate('/catalog', {
      state: {
        activeCategory: categoryId.toString(), // Pass category_id as string
        scrollTop: true
      }
    });
  };
  
  const handleShowAllClick = () => {
    if (categories && categories.length > 8) {
      if (!showAll) {
        setShowAll(true);
      } else {
        navigate('/catalog', {
          state: {
            scrollTop: true
          }
        });
      }
    } else {
      navigate('/catalog', {
        state: {
          scrollTop: true
        }
      });
    }
  };
  
  return (
    <section className="py-24">
      <div className="container px-4 mx-auto">
        <div className="text-center md:text-left mb-8">
          <span className="chip mb-4">Наше оборудование</span>
          <h2 className="heading-2">Категории оборудования</h2>
        </div>
        
        <p className="body-text max-w-2xl mx-auto md:mx-0 mb-12">
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
            visibleCategories?.map(category => (
              <Card 
                key={category.id} 
                className="group overflow-hidden border-0 transition-all duration-300 hover:shadow-lg cursor-pointer h-full flex flex-col" 
                onClick={() => handleCategoryClick(category.category_id)}
              >
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent z-10" />
                  <img 
                    src={category.imageUrl || categoryImages[category.name] || categoryImages.default} 
                    alt={category.name} 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = categoryImages.default;
                    }} 
                  />
                </div>
                <CardContent className="relative bg-white p-4 flex-1 flex flex-col">
                  <div className="flex-grow">
                    <h3 className="text-xl font-medium mb-1">{category.name}</h3>
                    {category.description && category.description.trim() && (
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-3">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategoryClick(category.category_id);
                      }} 
                      className="w-full justify-between text-primary hover:text-primary/80 hover:bg-primary/10 font-medium text-base"
                    >
                      Смотреть
                      <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        <div className="mt-12 flex justify-center">
          <Button onClick={handleShowAllClick} className="w-full sm:w-auto">
            Посмотреть все
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};
