
import { MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const MapSection = () => {
  const address = "г. Кемерово ул. Демьяна Бедного, 6";
  const yandexMapsUrl = `https://yandex.ru/maps/-/CHvDmII7`;
  const twoGisUrl = `https://go.2gis.com/2y9MJ`;

  return (
    <section className="py-12">
      <div className="bg-secondary/20 rounded-xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <MapPinIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Наш адрес</h3>
              <p className="text-muted-foreground">{address}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => window.open(yandexMapsUrl, '_blank')}
            >
              Яндекс Карты
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={() => window.open(twoGisUrl, '_blank')}
            >
              2GIS
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
