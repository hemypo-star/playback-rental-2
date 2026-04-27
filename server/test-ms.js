const path = require('path');
// Загружаем .env так же, как это делает твой сервер
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testConnection() {
  const MS_AUTH = process.env.MOYSKLAD_AUTH;
  const FOLDER_UUID = process.env.MS_CATEGORY_UUID;

  console.log('--- ТЕСТ ПОДКЛЮЧЕНИЯ К МОЙСКЛАД ---');
  console.log('Токен загружен:', MS_AUTH ? '✅ ДА' : '❌ НЕТ (проверь .env)');
  console.log('UUID папки загружен:', FOLDER_UUID ? '✅ ДА' : '❌ НЕТ (проверь .env)');

  if (!MS_AUTH) return;

  try {
    console.log('\nОтправляем запрос к API...');
    // Запрашиваем информацию о самой папке (просто чтобы проверить доступ)
    const response = await fetch(`https://api.moysklad.ru/api/remap/1.2/entity/productfolder/${FOLDER_UUID}`, {
      method: 'GET',
      headers: {
        'Authorization': MS_AUTH,
        'Accept': 'application/json;charset=utf-8',
        'Accept-Encoding': 'gzip'
      }
    });

    if (!response.ok) {
      console.log(`❌ Ошибка API: ${response.status}`);
      console.log(await response.text());
      return;
    }

    const data = await response.json();
    console.log('✅ УСПЕХ! Соединение работает отлично.');
    console.log(`API видит твою категорию: "${data.name}"`);

  } catch (error) {
    console.error('❌ Фатальная ошибка запроса:', error.message);
  }
}

testConnection();