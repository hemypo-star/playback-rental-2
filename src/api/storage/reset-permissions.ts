
import { resetStoragePermissions } from '@/services/storageService';
import { withCors } from '../_utils/middleware';

async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const success = await resetStoragePermissions();
    res.status(200).json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Unknown error' });
  }
}

export default withCors(handler);
