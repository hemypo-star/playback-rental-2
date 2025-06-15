
// Adapted from src/api/categories/index.ts for Next.js API

import { NextApiRequest, NextApiResponse } from 'next';
import { pgQuery } from '../../src/api/_utils/db';
import { sendSuccess, sendError } from '../../src/api/_utils/response';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const categories = await pgQuery('SELECT * FROM categories');
    sendSuccess(res, categories);
  } catch (e: any) {
    sendError(res, e);
  }
}
