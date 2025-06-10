
import { Package, Calendar, Clock, User, MapPin, Camera, CheckSquare } from 'lucide-react';

export const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-secondary/30">
      <div className="container px-4 mx-auto">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="chip mb-4">Простой процесс</span>
          <h2 className="heading-2 mb-6">Как работает аренда</h2>
          <p className="body-text max-w-2xl">
            Аренда оборудования у нас - это простой и беспроблемный процесс. Выполните следующие действия, чтобы приобрести оборудование, необходимое для вашего следующего проекта.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Просмотрите наш каталог",
              description: "Ознакомьтесь с нашей обширной коллекцией профессионального оборудования. Отфильтруйте по категориям или выполните поиск по конкретным позициям.",
              icon: <Package className="h-8 w-8 text-primary" />,
            },
            {
              title: "Проверьте наличие свободной техники",
              description: "Просмотрите календарь доступности выбранного вами оборудования, чтобы убедиться, что оно доступно в течение желаемого периода аренды.",
              icon: <Calendar className="h-8 w-8 text-primary" />,
            },
            {
              title: "Получите и создавайте",
              description: "Заберите оборудование в нашем пункте выдачи и приступайте к реализации своего проекта.",
              icon: <Camera className="h-8 w-8 text-primary" />,
            },
          ].map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center p-8 rounded-xl glass-card">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-primary/10 mb-6">
                {step.icon}
              </div>
              <h3 className="text-xl font-medium mb-4">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
