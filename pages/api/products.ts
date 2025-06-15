
// Adapted from src/api/products/index.ts for Next.js API

import { NextApiRequest, NextApiResponse } from 'next';
import { pgQuery } from '../../src/api/_utils/db';
import { sendSuccess, sendError } from '../../src/api/_utils/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const available = req.query.available;
    let products;
    if (available === 'true') {
      products = await pgQuery('SELECT * FROM products WHERE available = true');
    } else {
      products = await pgQuery('SELECT * FROM products');
    }
    res.setHeader('Content-Type', 'application/json');
    sendSuccess(res, products);
  } catch (e: any) {
    sendError(res, e);
  }
}
