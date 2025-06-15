
import { pgQuery } from '@/integrations/postgres/client'; // Исправлено
import { withCors } from '../_utils/middleware';
import { sendSuccess, sendError } from '../_utils/response';

async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // По умолчанию просто вернём все продукты (можно добавить фильтрацию по available, если нужно)
    const products = await pgQuery('SELECT * FROM products');
    sendSuccess(res, products);
  } catch (e) {
    sendError(res, e);
  }
}

export default withCors(handler);

