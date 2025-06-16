
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req: NextRequest) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  try {
    if (req.method === 'GET') {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM categories ORDER BY "order", category_id');
        return NextResponse.json({ success: true, data: result.rows }, { headers });
      } finally {
        client.release();
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { name, slug, description, imageUrl, order } = body;
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'INSERT INTO categories (name, slug, description, imageurl, "order") VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [name, slug || name.toLowerCase().replace(/\s+/g, '-'), description, imageUrl, order || 0]
        );
        return NextResponse.json({ success: true, data: result.rows[0] }, { headers });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers });
  } catch (error: any) {
    console.error('Categories API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers });
  }
}
