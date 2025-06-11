
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
      filePath = `${userId}/database-${Date.now()}.sql`
      
      // Upload database backup to storage
      const { error: uploadError } = await supabaseClient.storage
        .from('backups')
        .upload(filePath, dbBackup, {
          contentType: 'application/sql'
        })

      if (uploadError) throw uploadError
      fileSize = new Blob([dbBackup]).size
    }

    if (type === 'storage') {
      const storageBackup = await createStorageBackup(supabaseClient)
      filePath = `${userId}/storage-${Date.now()}.json`
      
      // Upload storage backup
      const { error: uploadError } = await supabaseClient.storage
        .from('backups')
        .upload(filePath, storageBackup, {
          contentType: 'application/json'
        })

      if (uploadError) throw uploadError
      fileSize = storageBackup.size
    }

    if (type === 'full') {
      // For full backup, create both database and storage backups
      const dbBackup = await createDatabaseBackup(supabaseClient)
      const storageBackup = await createStorageBackup(supabaseClient)
      
      // Create a combined backup manifest
      const fullBackupManifest = {
        timestamp: new Date().toISOString(),
        type: 'full',
        database: {
          filename: `database-${Date.now()}.sql`,
          size: new Blob([dbBackup]).size
        },
        storage: {
          filename: `storage-${Date.now()}.json`,
          size: storageBackup.size
        }
      }
      
      filePath = `${userId}/full-${Date.now()}.json`
      
      // Upload the manifest
      const { error: uploadError } = await supabaseClient.storage
        .from('backups')
        .upload(filePath, JSON.stringify(fullBackupManifest, null, 2), {
          contentType: 'application/json'
        })

      if (uploadError) throw uploadError
      
      // Also upload the individual files
      const dbFilePath = `${userId}/database-${Date.now()}.sql`
      const storageFilePath = `${userId}/storage-${Date.now()}.json`
      
      await supabaseClient.storage.from('backups').upload(dbFilePath, dbBackup, { contentType: 'application/sql' })
      await supabaseClient.storage.from('backups').upload(storageFilePath, storageBackup, { contentType: 'application/json' })
      
      fileSize = JSON.stringify(fullBackupManifest).length + new Blob([dbBackup]).size + storageBackup.size
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
  const buckets = ['products', 'categories', 'promotions']
  const backupData = {
    timestamp: new Date().toISOString(),
    type: 'storage_backup',
    buckets: {}
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
          lastModified: file.updated_at,
          id: file.id
        }))
      }
    } catch (error) {
      console.warn(`Could not list files in bucket ${bucket}:`, error)
      backupData.buckets[bucket] = { error: error.message }
    }
  }
  
  return new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
}
