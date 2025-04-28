
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import { getProducts } from '@/services/supabaseService'; // Updated import path

export const FeaturedProductsSection = () => {
  const { data: featuredProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: () => getProducts(),
    select: (data) => data.slice(0, 8),
  });

  return (
    <section className="py-20 bg-secondary/50">
      <div className="container px-4 mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="chip mb-3">Тщательно подобранный выбор</span>
            <h2 className="heading-2">Рекомендуемое оборудование</h2>
          </div>
          <Link to="/catalog">
            <Button variant="outline" className="group">
              Посмотреть все
              <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {productsLoading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="animate-pulse h-72 rounded-xl bg-white"></div>
            ))
          ) : (
            featuredProducts?.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </div>
    </section>
  );
};
