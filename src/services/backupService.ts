
import { supabase } from '@/integrations/supabase/client';

export interface BackupLog {
  id: string;
  user_id: string;
  backup_type: 'database' | 'storage' | 'full';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  file_path?: string;
  file_size?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export const backupService = {
  // Get all backup logs for the current user
  async getBackupLogs(): Promise<BackupLog[]> {
    const { data, error } = await supabase
      .from('backup_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch backup logs: ${error.message}`);
    }
    
    // Type assertion to ensure compatibility with our interface
    return (data || []) as BackupLog[];
  },

  // Create a new backup
  async createBackup(type: 'database' | 'storage' | 'full'): Promise<{ backup_id: string }> {
    const { data, error } = await supabase.functions.invoke('create-backup', {
      body: { type }
    });
    
    if (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
    
    return data;
  },

  // Download a backup file
  async downloadBackup(filePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from('backups')
      .download(filePath);
    
    if (error) {
      throw new Error(`Failed to download backup: ${error.message}`);
    }
    
    return data;
  },

  // Delete a backup
  async deleteBackup(backupId: string, filePath?: string): Promise<void> {
    // Delete file from storage if it exists
    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('backups')
        .remove([filePath]);
      
      if (storageError) {
        console.warn('Failed to delete backup file from storage:', storageError);
      }
    }
    
    // Delete backup log entry
    const { error } = await supabase
      .from('backup_logs')
      .delete()
      .eq('id', backupId);
    
    if (error) {
      throw new Error(`Failed to delete backup log: ${error.message}`);
    }
  },

  // Get backup file URL for direct download
  getBackupDownloadUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('backups')
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  },

  // Check backup status
  async getBackupStatus(backupId: string): Promise<BackupLog | null> {
    const { data, error } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('id', backupId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get backup status: ${error.message}`);
    }
    
    // Type assertion to ensure compatibility with our interface
    return data as BackupLog;
  }
};
