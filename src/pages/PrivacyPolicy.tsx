
const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <h1 className="heading-2 mb-8">Политика конфиденциальности</h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="mb-6">Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
          
          <section className="mb-8">
            <h2 className="heading-3 mb-4">1. Введение</h2>
            <p className="mb-4">
              Мы в PlayBack Rental уважаем вашу конфиденциальность и стремимся защищать ваши персональные данные. 
              Эта политика конфиденциальности объясняет, как мы собираем, используем и защищаем вашу информацию.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="heading-3 mb-4">2. Сбор информации</h2>
            <p className="mb-4">
              Мы собираем информацию, которую вы предоставляете нам напрямую при:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Создании учетной записи</li>
              <li>Оформлении заказа</li>
              <li>Подписке на рассылку</li>
              <li>Обращении в службу поддержки</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="heading-3 mb-4">3. Использование информации</h2>
            <p className="mb-4">
              Мы используем собранную информацию для:
            </p>
            <ul className="list-disc pl-6 mb-4">
              <li>Обработки ваших заказов</li>
              <li>Улучшения наших услуг</li>
              <li>Связи с вами по поводу заказов и акций</li>
              <li>Предотвращения мошенничества</li>
            </ul>
          </section>
          
          <section className="mb-8">
            <h2 className="heading-3 mb-4">4. Защита информации</h2>
            <p className="mb-4">
              Мы применяем соответствующие технические и организационные меры для защиты ваших персональных данных 
              от несанкционированного доступа, изменения, раскрытия или уничтожения.
            </p>
          </section>
          
          <section className="mb-8">
            <h2 className="heading-3 mb-4">5. Контактная информация</h2>
            <p className="mb-4">
              Если у вас есть вопросы о нашей политике конфиденциальности, пожалуйста, свяжитесь с нами:
            </p>
            <ul className="list-none pl-6 mb-4">
              <li>Email: PlaybackRental@yandex.ru</li>
              <li>Телефон: +7 (923) 530-30-20</li>
              <li>Адрес: Москва, ул. Ленина, д. 1, офис 123</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
