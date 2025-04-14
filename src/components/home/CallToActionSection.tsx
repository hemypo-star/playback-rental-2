
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export const CallToActionSection = () => {
  return (
    <section className="py-20 bg-gradient-to-r from-accent/90 to-accent text-white">
      <div className="container px-4 mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="heading-2 mb-6">Готовы арендовать высококачественное оборудование?</h2>
          <p className="text-xl text-white/90 mb-8">
            Начните просматривать наш каталог прямо сейчас, чтобы найти идеальное оборудование для вашего проекта.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="default" asChild className="bg-white text-accent hover:bg-white/90">
              <Link to="/catalog">Каталог</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-transparent hover:bg-white/10">
              <Link to="/contact">Контакты</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
