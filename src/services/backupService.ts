
import { supabase } from '@/integrations/supabase/client';
import { createBackup as serverCreateBackup } from './serverApi';

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
    
    return (data || []) as BackupLog[];
  },

  // Create and download a backup using server API
  async createAndDownloadBackup(type: 'database' | 'storage' | 'full'): Promise<void> {
    try {
      console.log(`Creating ${type} backup via server API...`);
      await serverCreateBackup(type);
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  },

  // Delete a backup log entry
  async deleteBackupLog(backupId: string): Promise<void> {
    const { error } = await supabase
      .from('backup_logs')
      .delete()
      .eq('id', backupId);
    
    if (error) {
      throw new Error(`Failed to delete backup log: ${error.message}`);
    }
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
    
    return data as BackupLog;
  }
};
