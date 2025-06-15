
import s3 from '@/integrations/s3/client';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!req.body && !req.files) {
    return res.status(400).json({ error: 'No file provided' });
  }

  let file: any;
  let fileName: string = '';
  let categoryId = '';
  if (typeof req.body === 'object') {
    file = req.body.file || (req.files && (req.files as any).file);
    if ('id' in req.body) categoryId = req.body.id;
  } else if (req.files) {
    file = (req.files as any).file;
  }
  if (!file) {
    return res.status(400).json({ error: 'File not found in request' });
  }

  const timestamp = Date.now();
  fileName = `category_${categoryId ? `${categoryId}_` : ''}${timestamp}_${file.name.replace(/\s+/g, '_')}`;

  try {
    await s3
      .upload({
        Bucket: 'categories',
        Key: fileName,
        Body: file.data,
        ContentType: file.mimetype,
        ACL: 'public-read',
      })
      .promise();

    const endpoint = s3.config.endpoint.toString().replace(/\/$/, "");
    const fileUrl = `${endpoint}/categories/${fileName}`;
    return res.status(200).json({ fileUrl });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
