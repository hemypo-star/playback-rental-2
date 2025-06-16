
import { Request, Response } from 'express';

// Simple router for API endpoints
export const apiRouter = (req: Request, res: Response) => {
  const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
  
  console.log('API Router - Processing:', pathname);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (pathname === '/api/categories') {
      import('./categories/index.js').then(module => module.default(req, res));
    } else if (pathname.startsWith('/api/products')) {
      import('./products/index.js').then(module => module.default(req, res));
    } else if (pathname.startsWith('/api/bookings')) {
      import('./bookings/index.js').then(module => module.default(req, res));
    } else {
      res.status(404).json({ error: 'API endpoint not found' });
    }
  } catch (error) {
    console.error('API Router error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
