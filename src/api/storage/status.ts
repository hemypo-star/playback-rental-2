
import { checkStorageStatus } from '@/services/storageService';
import { withCors } from '../_utils/middleware';

async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const status = await checkStorageStatus();
    res.status(200).json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
}

export default withCors(handler);
