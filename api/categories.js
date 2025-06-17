
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = async (req, res) => {
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
        const result = await client.query('SELECT * FROM categories ORDER BY "order", category_id');
        return res.status(200).json({ success: true, data: result.rows });
      } finally {
        client.release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Categories API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
