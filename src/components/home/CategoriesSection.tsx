
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getCategories } from '@/services/apiService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRightIcon } from 'lucide-react';

export const CategoriesSection = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  return (
    <section className="py-20 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="chip mb-3">Категории</span>
            <h2 className="heading-2">Оборудование для любых нужд</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse h-48 rounded-xl bg-white"></div>
            ))
          ) : (
            categories?.map((category) => (
              <Link 
                key={category.id} 
                to={`/catalog?category=${category.name}`}
                className="group"
              >
                <Card className="h-48 transition-all duration-300 group-hover:shadow-lg">
                  <CardContent className="h-full p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-medium mb-2">{category.name}</h3>
                      <p className="text-muted-foreground">{category.description}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      className="w-fit group/btn"
                    >
                      Смотреть
                      <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
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
