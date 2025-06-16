
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req: NextRequest) {
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
      const url = new URL(req.url);
      const productId = url.searchParams.get('productId');
      
      const client = await pool.connect();
      try {
        let query = 'SELECT * FROM bookings ORDER BY start_date';
        let params: any[] = [];
        
        if (productId && productId !== ':id') {
          query = 'SELECT * FROM bookings WHERE product_id = $1 ORDER BY start_date';
          params = [productId];
        }
        
        const result = await client.query(query, params);
        return NextResponse.json({ success: true, data: result.rows }, { headers });
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers });
  } catch (error: any) {
    console.error('Bookings API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers });
  }
}
