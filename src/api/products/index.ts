
import { pgQuery } from '../_utils/db';
import { withCors } from '../_utils/middleware';
import { sendSuccess, sendError } from '../_utils/response';

// Функция для парсинга query параметров (Node.js/Express совместимость)
function getQueryParams(req: any) {
  const url = req.url || '';
  const query: Record<string, string> = {};
  if (!url.includes('?')) return query;
  const params = url.split('?')[1];
  params.split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    query[decodeURIComponent(key)] = decodeURIComponent(value || '');
  });
  return query;
}

async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // --- КОРРЕКТНО ПАРСИРУЕМ QUERY ---
    const query = req.query || getQueryParams(req);
    let products;

    if (query.available === 'true') {
      // Только доступные продукты
      products = await pgQuery('SELECT * FROM products WHERE available = true');
    } else {
      // Все продукты
      products = await pgQuery('SELECT * FROM products');
    }

    // Для совместимости с клиентом всегда отдаем JSON
    res.setHeader('Content-Type', 'application/json');
    sendSuccess(res, products);
  } catch (e) {
    sendError(res, e);
  }
}

export default withCors(handler);

