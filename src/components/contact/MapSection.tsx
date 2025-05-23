
import { MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const MapSection = () => {
  const address = "г. Кемерово ул. Демьяна Бедного, 6";
  const yandexMapsUrl = `https://yandex.ru/maps/-/CHvDmII7`;
  const twoGisUrl = `https://go.2gis.com/2y9MJ`;
  
  return (
    <section className="my-16">
      <div className="rounded-xl bg-white shadow-soft p-8 subtle-ring">
        <h2 className="heading-3 mb-6">Как нас найти</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Map Info */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPinIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Адрес</h3>
                <p className="text-muted-foreground mb-4">{address}</p>
                <div className="flex gap-2">
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
          
          {/* Map Embed */}
          <div className="h-[400px] bg-secondary rounded-lg overflow-hidden">
            <iframe 
              src="https://yandex.ru/map-widget/v1/?um=constructor%3Ae9b389c797ebd911bd14eb1c2b7fee4b92a11b889222829da300d8eda69b02f6&amp;source=constructor" 
              width="100%" 
              height="100%" 
              frameBorder="0"
              title="Расположение PlaybackRental на карте"
              className="w-full h-full"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
