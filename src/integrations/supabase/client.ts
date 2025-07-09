// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database }   from './types'

const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL!
const SUPABASE_ANON  = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
  auth:  { autoRefreshToken: true, persistSession: true },
  db:    { schema: 'public' },
  // ⛔️ DO NOT set a global Content-Type header
})
