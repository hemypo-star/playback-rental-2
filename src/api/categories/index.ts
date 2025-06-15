
import { pgQuery } from '../_utils/db';
import { withCors } from '../_utils/middleware';
import { sendSuccess, sendError } from '../_utils/response';

async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    // Return all categories (add filtering if needed)
    const categories = await pgQuery('SELECT * FROM categories');
    sendSuccess(res, categories);
  } catch (e) {
    sendError(res, e);
  }
}

export default withCors(handler);
