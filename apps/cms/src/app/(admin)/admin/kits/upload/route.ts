// Regular multipart POST endpoint for kit photo uploads. Deliberately NOT a
// Server Action: RSC actions serialize FormData through an internal blob
// store that fails (500 / React error #418/#441) on large image payloads.
import { NextResponse } from 'next/server'
import { handleKitImageUpload } from '../../../../../lib/admin/data/kits'

export async function POST(req: Request) {
  const result = await handleKitImageUpload(req)
  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
