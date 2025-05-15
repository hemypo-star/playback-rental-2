
import { Card } from "@/components/ui/card";

const CompanyDescription = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-secondary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl">
          <h2 className="heading-2 mb-8 relative">
            О компании Playback
            <span className="absolute -bottom-2 left-0 w-24 h-1 bg-accent"></span>
          </h2>
          
          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <p className="body-text text-lg">
                  <span className="font-medium">Компания Playback</span> работает на рынке фото/видео производства с 2017 года, мы гордимся нашим опытом и отличной репутацией в индустрии, предлагая в аренду оборудование от известных брендов.
                </p>
                
                <p className="body-text">
                  Мы обладаем высокими компетенциями в области подбора и обслуживания техники, что позволяет нам предоставить идеальные решения для съемок различного масштаба – от небольших и крупных проектов. Наши специалисты всегда готовы помочь с выбором оборудования и предложить индивидуальные условия аренды.
                </p>
                
                <p className="body-text">
                  Работаем с частными клиентами, видеографами, фотографами и производственными командами. Мы предлагаем гибкие условия аренды и предоставляем только проверенную технику, что позволяет нашим клиентам сосредоточиться на своей работе, не беспокоясь о технических вопросах.
                </p>
              </div>
            </div>
            
            <div className="bg-white shadow-soft rounded-lg p-6 subtle-ring flex flex-col justify-center">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mb-3">
                  <span className="text-accent text-2xl font-bold">7</span>
                </div>
                <h3 className="font-semibold text-lg">Лет на рынке</h3>
              </div>
              <div className="border-t border-b border-muted py-4 my-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">500+</p>
                  <p className="text-muted-foreground">Успешных проектов</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Доверяют профессионалы</p>
                <p className="text-primary font-medium">Присоединяйтесь к нам!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CompanyDescription;
