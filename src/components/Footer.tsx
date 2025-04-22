import { Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-secondary mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold mb-4">Контакты</h3>
            <div className="space-y-3">
              <a href="mailto:info@playbackrental.ru" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="h-4 w-4" />
                info@playbackrental.ru
              </a>
              <a href="tel:+79001234567" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4" />
                +7 (900) 123-45-67
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Адрес</h3>
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
              <p>Г.Кемерово, ул. Демьяна Бедного, 6</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Документы</h3>
            <div className="space-y-2">
              <Link to="/privacy-policy" className="block text-muted-foreground hover:text-foreground transition-colors">
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
