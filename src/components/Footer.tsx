
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const Footer = () => {
  const address = "г. Кемерово, ул. Демьяна Бедного, 6";
  const yandexMapsUrl = `https://yandex.ru/maps/-/CHvDmII7`;
  const twoGisUrl = `https://go.2gis.com/2y9MJ`;

  return (
    <footer className="bg-secondary mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Контакты</h3>
            <div className="space-y-3">
              <a href="mailto:PlaybackRental@yandex.ru" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4" />
                PlaybackRental@yandex.ru
              </a>
              <a href="tel:+79235303020" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4" />
                +7 (923) 530-30-20
              </a>
              <div className="flex items-center gap-3 pt-2 py-0">
                <a href="https://vk.com/playbackrental" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M2.00053 5.5H5.50053C5.50053 13.5 10.0005 14.5 10.0005 14.5L10.0015 5.5H13.5015L13.4995 10.5C17.9995 8.5 18.4995 5.5 18.4995 5.5H21.9995C21.9995 5.5 20.9995 10 17.0926 12.1534C19.1115 13.3511 21.2684 15.3315 21.9995 18.5H18.4995C18.4995 18.5 17.4995 15.5 13.4995 14L13.5015 18.5C1.88755 18.5 2.00232 7.5 2.00053 5.5Z" />
                  </svg>
                </a>
                <a href="https://t.me/playbackrental" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                 <Send className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Адрес</h3>
            <div className="flex items-start gap-2 text-muted-foreground mb-3">
              <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
              <p>г. Кемерово, ул. Демьяна Бедного, 6</p>
            </div>
            <div className="flex gap-2">
              <Button size="xs" variant="outline" asChild>
                <a href={yandexMapsUrl} target="_blank" rel="noopener noreferrer">
                  Я.Карты
                </a>
              </Button>
              <Button size="xs" variant="outline" asChild>
                <a href={twoGisUrl} target="_blank" rel="noopener noreferrer">
                  2ГИС
                </a>
              </Button>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Документы</h3>
            <div className="space-y-2">
              <Link href="/privacy-policy" className="block text-muted-foreground hover:text-foreground transition-colors">
                Политика конфиденциальности
              </Link>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PlayBack Rental. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};
