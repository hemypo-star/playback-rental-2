
import { MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const MapSection = () => {
  const address = "г. Кемерово ул. Демьяна Бедного, 6";
  const encodedAddress = encodeURIComponent(address);
  const yandexMapsUrl = `https://yandex.ru/maps/?text=${encodedAddress}`;
  const twoGisUrl = `https://2gis.ru/kemerovo/search/${encodedAddress}`;

  return (
    <section className="py-20 bg-secondary/50">
      <div className="text-center mb-12">
        <h2 className="heading-2 mb-4">Посетите наш офис</h2>
        <p className="body-text max-w-2xl mx-auto">
          Мы удобно расположены в самом центре города. Приходите в наш выставочный зал, чтобы лично ознакомиться с нашим оборудованием.
        </p>
      </div>
      <div className="h-96 rounded-xl overflow-hidden subtle-ring">
        <div className="w-full h-full bg-white">
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="text-center p-8">
              <MapPinIcon className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Карта в процессе</h3>
              <p className="text-muted-foreground max-w-md mb-6">Мы работаем над созданием интерактивной карты. А пока вы можете найти нас по адресу г. Кемерово ул. Демьяна Бедного, 6</p>
              
              <div className="flex items-center justify-center gap-4">
                <Button size="sm" variant="outline" asChild>
                  <a href={yandexMapsUrl} target="_blank" rel="noopener noreferrer">
                    Я.Карты
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={twoGisUrl} target="_blank" rel="noopener noreferrer">
                    2ГИС
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
