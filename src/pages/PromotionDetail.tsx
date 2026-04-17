import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Promotion } from '@/types/promotion';
import { getProductImageUrl } from '@/utils/imageUtils';

// ИМПОРТИРУЕМ СТАНДАРТНЫЕ СЕРВИСЫ
import { getProducts } from '@/services/productService';
import { getCategories } from '@/services/categoryService';

import { PromotionsSlider } from '@/components/home/PromotionsSlider';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';

export default function PromotionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // 1. Загрузка данных самой акции
  useEffect(() => {
    const fetchPromo = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('slug', slug)
        .eq('active', true)
        .single();
      
      if (error || !data) {
        navigate('/not-found');
      } else {
        setPromotion(data);
        window.scrollTo(0, 0);
      }
      setLoading(false);
    };
    if (slug) fetchPromo();
  }, [slug, navigate]);

  // 2. Берем все товары и категории через ТВОИ стандартные сервисы (они правильно мапят imageUrl)
  const { data: allProducts } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    enabled: !!promotion?.linked_products?.length
  });

  const { data: allCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: !!promotion?.linked_categories?.length
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!promotion) return null;

  // 3. Фильтруем данные, оставляя только те, которые привязаны к акции
  const products = allProducts?.filter(p => promotion.linked_products?.includes(p.id)) || [];
  const categories = allCategories?.filter(c => promotion.linked_categories?.includes(c.id)) || [];

  const linkedItems = products.length > 0 ? products : categories;
  const displayItems = isExpanded ? linkedItems : linkedItems.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-start">
          
          {/* Лево: Изображение акции */}
          <div className="w-full">
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-[3/4] bg-muted">
              <img 
                src={getProductImageUrl(promotion.imageurl)} 
                alt={promotion.title} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
          </div>

          {/* Право: Контент */}
          <div className="space-y-8">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">{promotion.title}</h1>
            <div className="text-lg text-muted-foreground whitespace-pre-wrap">{promotion.content}</div>

            {/* Сетка привязанных товаров или категорий */}
            {linkedItems.length > 0 && (
              <div className="space-y-6 pt-4 border-t">
                <h3 className="text-xl font-semibold">Участвуют в акции:</h3>
                <div className="grid grid-cols-2 gap-4">
                  {products.length > 0 ? (
                    // Рендерим товары
                    displayItems.map((p: any) => <ProductCard key={p.id} product={p} />)
                  ) : (
                    // Рендерим категории
                    displayItems.map((c: any) => {
                      // Подстраховка для изображений категорий
                      const catImage = c.imageUrl || c.image_url || c.imageurl || '';
                      const catName = c.name || c.title || 'Категория';
                      
                      return (
                        <Link key={c.id} to={`/catalog/${c.slug}`} className="group">
                          <Card className="overflow-hidden h-full">
                            <AspectRatio ratio={1/1} className="relative bg-muted">
                              {catImage ? (
                                <img 
                                  src={getProductImageUrl(catImage)} 
                                  alt={catName}
                                  className="object-cover w-full h-full group-hover:scale-105 transition duration-300" 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-foreground text-sm">
                                  Нет фото
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-end p-4">
                                <span className="text-white font-bold leading-tight">{catName}</span>
                              </div>
                            </AspectRatio>
                          </Card>
                        </Link>
                      );
                    })
                  )}
                </div>

                {linkedItems.length > 6 && !isExpanded && (
                  <Button variant="outline" className="w-full" onClick={() => setIsExpanded(true)}>
                    Показать все ({linkedItems.length})
                  </Button>
                )}
              </div>
            )}

            {promotion.linkurl && (
              <Button asChild size="lg" className="w-full md:w-max px-10 h-14 text-lg">
                <a href={promotion.linkurl} target={promotion.linkurl.startsWith('http') ? "_blank" : "_self"}>
                  Перейти
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="border-t mt-12 bg-muted/20">
        <PromotionsSlider excludeId={promotion.id} title="Другие предложения" />
      </div>
    </div>
  );
}