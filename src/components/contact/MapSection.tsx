
import { MapPinIcon } from "lucide-react";

const MapSection = () => {
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
              <p className="text-muted-foreground max-w-md">Мы работаем над созданием интерактивной карты. А пока вы можете найти нас по адресу г. Кемерово ул. Демьяна Бедного, 6</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
