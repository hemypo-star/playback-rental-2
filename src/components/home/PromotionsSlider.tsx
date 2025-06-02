
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getActivePromotions } from '@/services/promotionService';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Skeleton } from "@/components/ui/skeleton";

export const PromotionsSlider = () => {
  const { data: promotions, isLoading, error } = useQuery({
    queryKey: ['activePromotions'],
    queryFn: getActivePromotions
  });
  
  // If there are no promotions or there's an error, don't render the section
  if ((!promotions || promotions.length === 0) && !isLoading) {
    return null;
  }
  
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <h2 className="heading-2 mb-8 text-center">Акции</h2>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-full h-[140px]">
                <Skeleton className="w-full h-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center text-destructive">
            Ошибка загрузки акций
          </div>
        ) : (
          <Carousel
            opts={{
              align: "start",
              loop: true
            }}
            className="w-full"
          >
            <CarouselContent>
              {promotions?.map((promotion) => (
                <CarouselItem key={promotion.id} className="md:basis-1/4 lg:basis-1/5">
                  <Link to={promotion.linkurl} className="block h-full">
                    <Card className="relative overflow-hidden h-full">
                      <AspectRatio ratio={3/4} className="bg-muted">
                        <img 
                          src={promotion.imageurl.startsWith('http') ? promotion.imageurl : `https://xwylatyyhqyfwsxfwzmn.supabase.co/storage/v1/object/public/products/${promotion.imageurl}`}
                          alt={promotion.title}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-2 pb-3 flex justify-center">
                          <Button variant="default" size="sm" className="z-10 text-xs">
                            Подробнее
                          </Button>
                        </div>
                      </AspectRatio>
                    </Card>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-1 lg:-left-12" />
            <CarouselNext className="right-1 lg:-right-12" />
          </Carousel>
        )}
      </div>
    </section>
  );
};
