
import { pgQuery } from '../_utils/db';
import { withCors } from '../_utils/middleware';
import { sendSuccess, sendError } from '../_utils/response';

async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const categories = await pgQuery('SELECT * FROM categories ORDER BY category_id');
    sendSuccess(res, categories);
  } catch (e: any) {
    console.error('Categories API error:', e);
    sendError(res, e);
  }
}

export default withCors(handler);
