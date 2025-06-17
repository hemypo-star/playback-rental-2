
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

  const { id } = req.query;

  try {
    if (req.method === 'GET') {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM products WHERE product_id = $1', [id]);
        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Product not found' });
        }
        return res.status(200).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    }

    if (req.method === 'PUT') {
      const { 
        name, 
        description, 
        category_id,
        daily_price,
        weekly_price,
        monthly_price,
        image_url,
        availability_status
      } = req.body;
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'UPDATE products SET name = $1, description = $2, category_id = $3, daily_price = $4, weekly_price = $5, monthly_price = $6, image_url = $7, availability_status = $8 WHERE product_id = $9 RETURNING *',
          [name, description, category_id, daily_price, weekly_price, monthly_price, image_url, availability_status, id]
        );
        return res.status(200).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    }

    if (req.method === 'DELETE') {
      const client = await pool.connect();
      try {
        const result = await client.query('DELETE FROM products WHERE product_id = $1', [id]);
        return res.status(200).json({ success: true, data: { deleted: result.rowCount > 0 } });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Product API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
