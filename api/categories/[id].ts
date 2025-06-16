
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req: NextRequest, { params }: { params: { id: string } }) {
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT,DELETE',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  const { id } = params;

  try {
    if (req.method === 'PUT') {
      const body = await req.json();
      const { name, slug, description, imageUrl, order } = body;
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'UPDATE categories SET name = $1, slug = $2, description = $3, imageurl = $4, "order" = $5 WHERE category_id = $6 RETURNING *',
          [name, slug, description, imageUrl, order, id]
        );
        return NextResponse.json({ success: true, data: result.rows[0] }, { headers });
      } finally {
        client.release();
      }
    }

    if (req.method === 'DELETE') {
      const client = await pool.connect();
      try {
        const result = await client.query('DELETE FROM categories WHERE category_id = $1', [id]);
        return NextResponse.json({ success: true, data: { deleted: result.rowCount > 0 } }, { headers });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers });
  } catch (error: any) {
    console.error('Category API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers });
  }
}
