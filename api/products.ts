
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM products ORDER BY product_id');
        return res.status(200).json({ success: true, data: result.rows });
      } finally {
        client.release();
      }
    }

    if (req.method === 'POST') {
      const {
        name,
        description,
        category_id,
        daily_price,
        weekly_price,
        monthly_price,
        image_url,
        availability_status = 'available'
      } = req.body;

      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO products (name, description, category_id, daily_price, weekly_price, monthly_price, image_url, availability_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
          [name, description, category_id, daily_price, weekly_price, monthly_price, image_url, availability_status]
        );
        return res.status(200).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Products API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
