import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Promotion } from '@/types/promotion';
import { getProductImageUrl } from '@/utils/imageUtils';
import { PromotionsSlider } from '@/components/home/PromotionsSlider';
import { Button } from '@/components/ui/button';

export default function PromotionDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPromotion = async () => {
      try {
        const { data, error } = await supabase
          .from('promotions')
          .select('*')
          .eq('slug', slug)
          .eq('active', true)
          .single();

        if (error || !data) {
          navigate('/not-found', { replace: true });
        } else {
          setPromotion(data);
          // Скроллим наверх при переключении между акциями
          window.scrollTo(0, 0);
        }
      } catch (err) {
        console.error("Error fetching promotion:", err);
        navigate('/not-found', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchPromotion();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!promotion) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Сетка основной части страницы */}
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          
          {/* Левая колонка: Изображение */}
          <div className="w-full">
            <div className="rounded-2xl overflow-hidden shadow-xl bg-muted aspect-[3/4]">
              <img 
                src={getProductImageUrl(promotion.imageurl)} 
                alt={promotion.title} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/placeholder.svg';
                }}
              />
            </div>
          </div>

          {/* Правая колонка: Текст и Кнопка */}
          <div className="flex flex-col space-y-6">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">
              {promotion.title}
            </h1>

            <div className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {promotion.content}
            </div>

            {promotion.linkurl && (
              <div className="pt-4">
                <Button 
                  asChild 
                  size="lg" 
                  className="w-full md:w-max px-12 h-14 text-lg font-semibold"
                >
                  <a 
                    href={promotion.linkurl} 
                    target={promotion.linkurl.startsWith('http') ? "_blank" : "_self"} 
                    rel="noopener noreferrer"
                  >
                    Перейти
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Разделитель */}
      <div className="container mx-auto px-4">
        <hr className="border-muted" />
      </div>

      {/* Нижний слайдер: Другие акции */}
      <div className="bg-muted/30">
        <PromotionsSlider 
          excludeId={promotion.id} 
          title="Другие актуальные акции" 
        />
      </div>
    </div>
  );
}