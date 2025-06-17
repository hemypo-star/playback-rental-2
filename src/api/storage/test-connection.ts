
import { NextRequest, NextResponse } from 'next/server';

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

  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers });
  }

  try {
    const body = await req.json();
    const { bucket } = body;

    if (!bucket || typeof bucket !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid bucket' }, { status: 400, headers });
    }

    // Placeholder for testing storage connection
    const result = {
      connected: true,
      bucket: bucket,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(result, { headers });
  } catch (error: any) {
    console.error('Test connection API error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500, headers });
  }
}
