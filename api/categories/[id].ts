
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req: any, res: any) => {
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
    if (req.method === 'PUT') {
      const { name, slug, description, imageUrl, order } = req.body;
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'UPDATE categories SET name = $1, slug = $2, description = $3, imageurl = $4, "order" = $5 WHERE category_id = $6 RETURNING *',
          [name, slug, description, imageUrl, order, id]
        );
        return res.status(200).json({ success: true, data: result.rows[0] });
      } finally {
        client.release();
      }
    }

    if (req.method === 'DELETE') {
      const client = await pool.connect();
      try {
        const result = await client.query('DELETE FROM categories WHERE category_id = $1', [id]);
        return res.status(200).json({ success: true, data: { deleted: result.rowCount > 0 } });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Category API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
