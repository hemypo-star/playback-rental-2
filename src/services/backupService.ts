
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
    
    return (data || []) as BackupLog[];
  },

  // Create and download a backup directly
  async createAndDownloadBackup(type: 'database' | 'storage' | 'full'): Promise<void> {
    try {
      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Call the edge function which will return the file directly
      const response = await fetch(`http://84.201.170.203:8000/functions/v1/create-backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `backup-${Date.now()}`;
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="(.+)"/);
        if (matches) {
          filename = matches[1];
        }
      }

      // Get the blob and create download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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
