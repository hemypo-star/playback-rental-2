
import { MapPinIcon, Phone, Send, Facebook, MailIcon } from "lucide-react";

const ContactDetails = () => {
  return (
    <div className="space-y-8">
      <div className="grid gap-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPinIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium mb-1">Наше местоположение</h3>
            <p className="text-muted-foreground">
              Г.Кемерово <br />
              ул. Демьяна Бедного, 6 
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Phone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium mb-1">Телефон</h3>
            <p className="text-muted-foreground">
              <a href="tel:+79001234567" className="hover:text-primary transition-colors">
                +7 (900) 123-45-67
              </a>
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Send className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium mb-1">Telegram</h3>
            <p className="text-muted-foreground">
              <a href="https://t.me/yourcompany" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                @yourcompany
              </a>
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Facebook className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium mb-1">VKontakte</h3>
            <p className="text-muted-foreground">
              <a href="https://vk.com/yourcompany" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                /yourcompany
              </a>
            </p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MailIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium mb-1">E-mail</h3>
            <p className="text-muted-foreground">
              <a href="mailto:PlaybackRental@yandex.ru" className="hover:text-primary transition-colors">
                PlaybackRental@yandex.ru
              </a>
            </p>
          </div>
        </div>
      </div>
      
      <div className="pt-6">
        <h3 className="font-medium mb-3">График работы</h3>
        <div className="space-y-2 text-muted-foreground">
          <div className="flex justify-between">
            <span>Будние:</span>
            <span>10:00 - 20:00</span>
          </div>
          <div className="flex justify-between">
            <span>Выходные:</span>
            <span>По предварительной записи</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactDetails;
