import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Promotion } from '@/types/promotion';
import { getProductImageUrl } from '@/utils/imageUtils';

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
          .eq('active', true) // Отсекаем неактивные
          .single();

        if (error || !data) {
          navigate('/not-found', { replace: true });
        } else {
          setPromotion(data);
        }
      } catch (err) {
        console.error("Error fetching promotion details:", err);
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
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center">{promotion.title}</h1>
      
      {promotion.imageurl && (
        <div className="mb-10 rounded-xl overflow-hidden shadow-lg mx-auto max-w-2xl bg-muted">
          <img 
            src={getProductImageUrl(promotion.imageurl)} 
            alt={promotion.title} 
            className="w-full h-auto object-cover max-h-[600px]"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/placeholder.svg';
            }}
          />
        </div>
      )}

      {/* Класс whitespace-pre-wrap отвечает за сохранение переносов из обычного Textarea */}
      <div className="text-lg leading-relaxed whitespace-pre-wrap mb-10 text-gray-800">
        {promotion.content}
      </div>

      {promotion.linkurl && (
        <div className="text-center mt-8">
          <a 
            href={promotion.linkurl} 
            target={promotion.linkurl.startsWith('http') ? "_blank" : "_self"} 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-12 px-8 py-3"
          >
            Узнать подробности / Забронировать
          </a>
        </div>
      )}
    </div>
  );
}