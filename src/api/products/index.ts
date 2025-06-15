
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pgQuery } from '../_utils/db';
import { withCors } from '../_utils/middleware';
import { sendSuccess, sendError } from '../_utils/response';

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const products = await pgQuery('SELECT * FROM products');
    sendSuccess(res, products);
  } catch (e) {
    sendError(res, e);
  }
}

// Обязательно оборачиваем в middleware (CORS)
export default withCors(handler);
