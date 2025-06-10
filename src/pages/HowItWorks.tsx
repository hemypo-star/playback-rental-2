
import { Calendar, Camera, CheckSquare, Clock, Search, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="w-full bg-gradient-to-r from-primary/90 to-primary">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="heading-1 text-white mb-6">Как мы работаем</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Аренда профессионального оборудования еще никогда не была такой простой. Следуйте нашему простому процессу, чтобы приобрести оборудование, необходимое для вашего следующего проекта.
          </p>
        </div>
      </div>

      {/* Process Steps */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-12">
            {[
              {
                step: 1,
                title: "Просмотрите наш каталог",
                description: "Выберите товары из нашего обширного каталога профессионального оборудования. Найдите именно то, что вам нужно для вашего проекта.",
                icon: <Search className="h-10 w-10 text-primary" />
              },
              {
                step: 2,
                title: "Проверьте наличие свободной техники",
                description: "Выберите дату аренды, когда вам нужно оборудование. Проверьте доступность на интересующие вас даты через наш календарь.",
                icon: <Calendar className="h-10 w-10 text-primary" />
              },
              {
                step: 3,
                title: "Выберите период аренды",
                description: "Выберите время аренды: 4 часа, 1 день, 3 дня или более 5 дней. Воспользуйтесь скидками при длительной аренде.",
                icon: <Clock className="h-10 w-10 text-primary" />
              },
              {
                step: 4,
                title: "Бронирование",
                description: "Оформите заказ, указав свои контактные данные. Вы получите подтверждение бронирования с всей необходимой информацией.",
                icon: <ShoppingCart className="h-10 w-10 text-primary" />
              },
              {
                step: 5,
                title: "Заберите оборудование",
                description: "Заберите товары в нашем офисе в удобное для вас время. Наши сотрудники помогут вам с настройкой и ответят на вопросы.",
                icon: <Truck className="h-10 w-10 text-primary" />
              },
              {
                step: 6,
                title: "Создайте свой проект",
                description: "Используйте оборудование для своего проекта. При необходимости наши специалисты окажут техническую поддержку.",
                icon: <Camera className="h-10 w-10 text-primary" />
              },
              {
                step: 7,
                title: "Верните оборудование",
                description: "Верните товары по истечении срока аренды. Наши сотрудники проверят оборудование и завершат процесс аренды.",
                icon: <CheckSquare className="h-10 w-10 text-primary" />
              }
            ].map((step, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    {step.icon}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                      {step.step}
                    </div>
                    <h3 className="text-xl font-medium">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Information */}
      <div className="bg-secondary/50 w-full">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <h2 className="heading-2 mb-4">Наши цены на аренду</h2>
            <p className="body-text max-w-2xl mx-auto">
              Мы предлагаем гибкие сроки аренды по конкурентоспособным ценам. Воспользуйтесь скидками при длительной аренде.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              {
                period: "4 часа",
                description: "Идеально подходит для коротких съемок и быстрых проектов",
                price: "70% от дневной нормы",
                feature: "Аренда в тот же день"
              },
              {
                period: "1 день",
                description: "Наш стандартный срок аренды для большинства проектов",
                price: "Базовая дневная ставка",
                feature: "срок аренды - 24 часа"
              },
              {
                period: "3 дня",
                description: "Идеально подходит для проектов и мероприятий выходного дня",
                price: "скидка 10% в день",
                feature: "Увеличенное время съемки"
              },
              {
                period: "Более 5 дней",
                description: "Для длительных съемок и специальных проектов",
                price: "скидка 30% в день",
                feature: "Максимальная экономия"
              }
            ].map((option, index) => (
              <Card key={index} className="p-6 text-center">
                <h3 className="text-xl font-semibold mb-2">{option.period}</h3>
                <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
                <div className="bg-primary/10 rounded-lg py-3 px-4 mb-4">
                  <p className="font-medium text-primary">{option.price}</p>
                </div>
                <p className="text-sm flex items-center justify-center">
                  <CheckSquare className="h-4 w-4 mr-2 text-green-500" />
                  {option.feature}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="heading-2 mb-4">Часто задаваемые вопросы</h2>
          <p className="body-text max-w-2xl mx-auto">
            У вас есть вопросы о процессе аренды? Ниже вы найдете ответы на часто задаваемые вопросы.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          {[
            {
              question: "Требуется ли вам внести залог за аренду оборудования?",
              answer: "Да, мы требуем внести страховой залог, который полностью возвращается при возврате оборудования в хорошем состоянии. Сумма залога варьируется в зависимости от стоимости оборудования."
            },
            {
              question: "Что произойдет, если я верну оборудование с опозданием?",
              answer: "Поздний возврат оплачивается по ежедневному тарифу. Мы рекомендуем связаться с нами заранее, если вам необходимо продлить срок аренды, так как это может быть сделано со скидкой."
            },
            {
              question: "Вы предлагаете услуги доставки?",
              answer: "Да, мы предлагаем доставку за дополнительную плату в зависимости от расстояния. Пожалуйста, свяжитесь с нами, чтобы узнать стоимость доставки в ваше местоположение."
            },
            {
              question: "Какие документы, удостоверяющие личность, требуются для аренды?",
              answer: "Нам требуется действительное удостоверение личности с фотографией государственного образца и кредитная карта на то же имя. Для юридических лиц мы можем потребовать дополнительные документы."
            },
            {
              question: "Требуется ли страховка при аренде?",
              answer: "Мы предлагаем планы защиты оборудования, которые покрывают случайное повреждение. Хотя это и не является обязательным, мы настоятельно рекомендуем использовать это покрытие для вашего спокойствия."
            }
          ].map((faq, index) => (
            <div key={index} className="p-6 rounded-xl glass-card">
              <h3 className="text-lg font-medium mb-2">{faq.question}</h3>
              <p className="text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="w-full bg-gradient-to-r from-primary/90 to-primary">
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="heading-2 mb-6 text-white">Готовы арендовать оборудование?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Просмотрите наш каталог прямо сейчас, чтобы найти идеальное оборудование для вашего следующего проекта.
          </p>
          <Button size="lg" variant="default" asChild className="bg-white text-primary hover:bg-white/90">
            <Link to="/catalog">Просмотр каталога оборудования</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
