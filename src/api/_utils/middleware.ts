
/**
 * Universal CORS middleware for your API routes
 */
export function withCors(handler: Function) {
  return async (req: any, res: any) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    return handler(req, res);
  }
}

/**
 * Simple Bearer auth middleware
 */
export function withAuth(handler: Function) {
  return async (req: any, res: any) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    if (!token || token !== process.env.API_SECRET_TOKEN) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    return handler(req, res);
  }
}
