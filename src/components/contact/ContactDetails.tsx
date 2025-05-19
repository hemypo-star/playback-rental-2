
import { MapPinIcon, Phone, Send, Facebook, MailIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContactDetails = () => {
  const address = "г. Кемерово ул. Демьяна Бедного, 6";
  const encodedAddress = encodeURIComponent(address);
  const yandexMapsUrl = `https://yandex.ru/maps/?text=${encodedAddress}`;
  const twoGisUrl = `https://2gis.ru/kemerovo/search/${encodedAddress}`;

  return (
    <div className="space-y-8">
      <div className="grid gap-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPinIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium mb-1">Наше местоположение</h3>
            <p className="text-muted-foreground mb-2">
              г.Кемерово ул. Демьяна Бедного, 6 
            </p>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M2.00053 5.5H5.50053C5.50053 13.5 10.0005 14.5 10.0005 14.5L10.0015 5.5H13.5015L13.4995 10.5C17.9995 8.5 18.4995 5.5 18.4995 5.5H21.9995C21.9995 5.5 20.9995 10 17.0926 12.1534C19.1115 13.3511 21.2684 15.3315 21.9995 18.5H18.4995C18.4995 18.5 17.4995 15.5 13.4995 14L13.5015 18.5C1.88755 18.5 2.00232 7.5 2.00053 5.5Z" />
                  </svg>
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
