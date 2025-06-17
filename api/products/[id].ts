
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
    if (req.method === 'GET') {
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          return NextResponse.json({ error: 'Product not found' }, { status: 404, headers });
        }
        return NextResponse.json({ success: true, data: result.rows[0] }, { headers });
      } finally {
        client.release();
      }
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { 
        name, 
        description, 
        price, 
        imageUrl, 
        available, 
        categoryId, 
        features,
        specifications 
      } = body;
      
      const client = await pool.connect();
      try {
        const result = await client.query(
          'UPDATE products SET name = $1, description = $2, price = $3, imageurl = $4, available = $5, category_id = $6, features = $7, specifications = $8 WHERE id = $9 RETURNING *',
          [name, description, price, imageUrl, available, categoryId, JSON.stringify(features), JSON.stringify(specifications), id]
        );
        return NextResponse.json({ success: true, data: result.rows[0] }, { headers });
      } finally {
        client.release();
      }
    }

    if (req.method === 'DELETE') {
      const client = await pool.connect();
      try {
        const result = await client.query('DELETE FROM products WHERE id = $1', [id]);
        return NextResponse.json({ success: true, data: { deleted: result.rowCount > 0 } }, { headers });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers });
  } catch (error: any) {
    console.error('Product API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers });
  }
}
