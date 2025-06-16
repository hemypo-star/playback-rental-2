
import { pgQuery } from '../_utils/db';
import { withCors } from '../_utils/middleware';
import { sendSuccess, sendError } from '../_utils/response';

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
    const query = req.query || getQueryParams(req);
    let bookings;
    
    if (query.productId && query.productId !== ':id') {
      // Get bookings for specific product
      bookings = await pgQuery(
        'SELECT * FROM bookings WHERE product_id = $1 ORDER BY start_date',
        [query.productId]
      );
    } else {
      // Get all bookings
      bookings = await pgQuery('SELECT * FROM bookings ORDER BY start_date');
    }
    
    sendSuccess(res, bookings);
  } catch (e: any) {
    console.error('Bookings API error:', e);
    sendError(res, e);
  }
}

export default withCors(handler);
