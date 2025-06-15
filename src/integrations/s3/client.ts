
import AWS from 'aws-sdk';

/**
 * S3 клиент для хранения файлов.
 * 
 * ВАЖНО: Никогда не храните приватные ключи или секреты в публичном репозитории!
 * Для теста и разработки подставьте свои значения, но для production — используйте переменные окружения.
 * 
 * Инструкция:
 *  1. Зарегистрируйтесь и получите accessKeyId и secretAccessKey для S3-провайдера (Amazon, Yandex, VK Cloud и т.д.)
 *  2. Для endpoint используйте URL провайдера (например https://s3.eu-central-1.amazonaws.com)
 *  3. Для region — ваш регион (например eu-central-1)
 * 
 * Используйте переменные окружения или секреты!
 */

const s3 = new AWS.S3({
  accessKeyId: "ВАШ_S3_ACCESS_KEY_ID",       // <-- замените на свой ключ
  secretAccessKey: "ВАШ_S3_SECRET_ACCESS_KEY", // <-- замените на свой секрет
  endpoint: "ВАШ_S3_ENDPOINT",                  // например, https://storage.yandexcloud.net
  region: "ВАШ_S3_REGION",                      // например, ru-central1
  s3ForcePathStyle: true,
  signatureVersion: "v4"
});

export default s3;
