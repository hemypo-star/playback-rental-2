
import { testStorageConnection } from '@/services/storageService';
import { withCors } from '../_utils/middleware';

async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { bucket } = req.body;

  if (!bucket || typeof bucket !== 'string') {
    res.status(400).json({ error: 'Missing or invalid bucket' });
    return;
  }

  try {
    const result = await testStorageConnection(bucket);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
}

export default withCors(handler);
