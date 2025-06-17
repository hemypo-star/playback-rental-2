
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

  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers });
  }

  try {
    // Return a basic storage status - you can expand this based on your storage service
    const status = {
      connected: true,
      service: 'local',
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(status, { headers });
  } catch (error: any) {
    console.error('Storage status API error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500, headers });
  }
}
