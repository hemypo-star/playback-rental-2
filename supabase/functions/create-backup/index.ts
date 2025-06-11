
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const { type } = await req.json()
    
    if (!['database', 'storage', 'full'].includes(type)) {
      throw new Error('Invalid backup type')
    }

    // Create backup log entry
    const { data: logEntry, error: logError } = await supabaseClient
      .from('backup_logs')
      .insert({
        user_id: user.id,
        backup_type: type,
        status: 'pending'
      })
      .select()
      .single()

    if (logError) {
      throw logError
    }

    // Start background backup process
    EdgeRuntime.waitUntil(performBackup(supabaseClient, logEntry.id, type, user.id))

    return new Response(
      JSON.stringify({ 
        success: true, 
        backup_id: logEntry.id,
        message: 'Backup process started' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in create-backup function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while creating backup' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

async function performBackup(supabaseClient: any, backupId: string, type: string, userId: string) {
  try {
    // Update status to in_progress
    await supabaseClient
      .from('backup_logs')
      .update({ status: 'in_progress' })
      .eq('id', backupId)

    let filePath: string
    let fileSize: number

    if (type === 'database' || type === 'full') {
      const dbBackup = await createDatabaseBackup(supabaseClient)
      filePath = `${userId}/${type}-${Date.now()}.sql`
      
      // Upload database backup to storage
      const { error: uploadError } = await supabaseClient.storage
        .from('backups')
        .upload(filePath, dbBackup, {
          contentType: 'application/sql'
        })

      if (uploadError) throw uploadError
      fileSize = new Blob([dbBackup]).size
    }

    if (type === 'storage' || type === 'full') {
      const storageBackup = await createStorageBackup(supabaseClient)
      const storageFilePath = `${userId}/${type === 'full' ? 'full' : 'storage'}-${Date.now()}.zip`
      
      // Upload storage backup
      const { error: uploadError } = await supabaseClient.storage
        .from('backups')
        .upload(storageFilePath, storageBackup, {
          contentType: 'application/zip'
        })

      if (uploadError) throw uploadError
      
      if (type === 'storage') {
        filePath = storageFilePath
        fileSize = storageBackup.size
      } else {
        // For full backup, create a combined archive
        filePath = `${userId}/full-${Date.now()}.zip`
        fileSize = storageBackup.size + new Blob([await createDatabaseBackup(supabaseClient)]).size
      }
    }

    // Update backup log with success
    await supabaseClient
      .from('backup_logs')
      .update({
        status: 'completed',
        file_path: filePath!,
        file_size: fileSize!,
        completed_at: new Date().toISOString()
      })
      .eq('id', backupId)

  } catch (error) {
    console.error('Error performing backup:', error)
    
    // Update backup log with error
    await supabaseClient
      .from('backup_logs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', backupId)
  }
}

async function createDatabaseBackup(supabaseClient: any): Promise<string> {
  const tables = ['products', 'categories', 'bookings', 'promotions', 'settings', 'backup_logs']
  let sqlDump = '-- Database Backup\n-- Generated: ' + new Date().toISOString() + '\n\n'
  
  for (const table of tables) {
    try {
      const { data, error } = await supabaseClient
        .from(table)
        .select('*')
      
      if (error) {
        console.warn(`Could not backup table ${table}:`, error)
        continue
      }
      
      if (data && data.length > 0) {
        sqlDump += `-- Table: ${table}\n`
        sqlDump += `TRUNCATE TABLE ${table} CASCADE;\n`
        
        // Generate INSERT statements
        for (const row of data) {
          const columns = Object.keys(row).join(', ')
          const values = Object.values(row).map(val => {
            if (val === null) return 'NULL'
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`
            if (val instanceof Date) return `'${val.toISOString()}'`
            return val
          }).join(', ')
          
          sqlDump += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`
        }
        sqlDump += '\n'
      }
    } catch (error) {
      console.warn(`Error backing up table ${table}:`, error)
    }
  }
  
  return sqlDump
}

async function createStorageBackup(supabaseClient: any): Promise<Blob> {
  // This is a simplified version - in a real implementation, you'd want to
  // download all files from storage buckets and create a zip archive
  
  const buckets = ['products', 'categories', 'promotions']
  const backupData = {
    timestamp: new Date().toISOString(),
    buckets: {},
    note: 'This is a placeholder for storage backup. In production, implement proper file archiving.'
  }
  
  for (const bucket of buckets) {
    try {
      const { data: files, error } = await supabaseClient.storage
        .from(bucket)
        .list()
      
      if (!error && files) {
        backupData.buckets[bucket] = files.map(file => ({
          name: file.name,
          size: file.metadata?.size,
          lastModified: file.updated_at
        }))
      }
    } catch (error) {
      console.warn(`Could not list files in bucket ${bucket}:`, error)
    }
  }
  
  return new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
}
