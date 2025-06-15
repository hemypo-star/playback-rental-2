
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';

const PrivacyPolicy = () => {
  return (
    <Layout title="Политика конфиденциальности" description="Политика конфиденциальности PlayBack Rental">
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="text-3xl">Политика конфиденциальности</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <p>Последнее обновление: {new Date().toLocaleDateString('ru-RU')}</p>
              
              <h2>1. Общие положения</h2>
              <p>
                Настоящая Политика конфиденциальности описывает, как мы собираем, используем и защищаем 
                вашу персональную информацию при использовании нашего сервиса аренды оборудования.
              </p>

              <h2>2. Сбор информации</h2>
              <p>Мы собираем следующую информацию:</p>
              <ul>
                <li>Контактные данные (имя, email, телефон)</li>
                <li>Информацию о заказах и бронированиях</li>
                <li>Данные об использовании сайта</li>
              </ul>

              <h2>3. Использование информации</h2>
              <p>Мы используем собранную информацию для:</p>
              <ul>
                <li>Обработки заказов и бронирований</li>
                <li>Связи с клиентами</li>
                <li>Улучшения качества услуг</li>
              </ul>

              <h2>4. Защита данных</h2>
              <p>
                Мы принимаем все необходимые меры для защиты ваших персональных данных от 
                несанкционированного доступа, изменения или раскрытия.
              </p>

              <h2>5. Контакты</h2>
              <p>
                По вопросам конфиденциальности обращайтесь по адресу: 
                <a href="mailto:PlaybackRental@yandex.ru" className="text-primary">
                  PlaybackRental@yandex.ru
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;
