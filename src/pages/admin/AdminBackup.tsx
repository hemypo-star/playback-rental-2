
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupService } from '@/services/backupService';
import { 
  Database, 
  HardDrive, 
  Download, 
  Trash2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  FileArchive
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface BackupLog {
  id: string;
  backup_type: 'database' | 'storage' | 'full';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  file_path?: string;
  file_size?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

const AdminBackup = () => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch backup logs
  const { data: backupLogs, isLoading } = useQuery({
    queryKey: ['backup-logs'],
    queryFn: backupService.getBackupLogs
  });

  // Create and download backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (backupType: 'database' | 'storage' | 'full') => {
      await backupService.createAndDownloadBackup(backupType);
    },
    onSuccess: () => {
      toast({
        title: 'Резервная копия создана',
        description: 'Файл резервной копии загружается на ваш компьютер'
      });
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка создания резервной копии',
        description: error.message || 'Произошла ошибка при создании резервной копии',
        variant: 'destructive'
      });
    }
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (backupId: string) => {
      await backupService.deleteBackupLog(backupId);
    },
    onSuccess: () => {
      toast({
        title: 'Запись удалена',
        description: 'Запись о резервной копии удалена из истории'
      });
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка удаления',
        description: error.message || 'Не удалось удалить запись',
        variant: 'destructive'
      });
    }
  });

  const handleCreateBackup = async (type: 'database' | 'storage' | 'full') => {
    setIsCreatingBackup(true);
    try {
      await createBackupMutation.mutateAsync(type);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Неизвестно';
    
    const units = ['Б', 'КБ', 'МБ', 'ГБ'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getBackupTypeIcon = (type: string) => {
    switch (type) {
      case 'storage':
      case 'full':
        return <FileArchive className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getBackupDescription = (backup: BackupLog) => {
    const baseDesc = formatDistanceToNow(new Date(backup.created_at), { 
      addSuffix: true, 
      locale: ru 
    });
    
    if (backup.file_size) {
      return `${baseDesc} • ${formatFileSize(backup.file_size)}`;
    }
    
    return baseDesc;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Резервные копии</h1>
        <p className="text-muted-foreground">
          Создавайте и скачивайте резервные копии базы данных и файлов напрямую
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              База данных
            </CardTitle>
            <CardDescription>
              Скачать резервную копию всех таблиц и данных
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleCreateBackup('database')}
              disabled={isCreatingBackup || createBackupMutation.isPending}
              className="w-full"
            >
              {createBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Скачать БД
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              Файлы
            </CardTitle>
            <CardDescription>
              Скачать ZIP-архив всех загруженных файлов
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleCreateBackup('storage')}
              disabled={isCreatingBackup || createBackupMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {createBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Скачать файлы
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <FileArchive className="h-4 w-4" />
              Полная копия
            </CardTitle>
            <CardDescription>
              Скачать полную резервную копию в ZIP-архиве
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleCreateBackup('full')}
              disabled={isCreatingBackup || createBackupMutation.isPending}
              className="w-full"
              variant="secondary"
            >
              {createBackupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Скачать всё
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <Alert>
        <Download className="h-4 w-4" />
        <AlertDescription>
          Резервные копии теперь создаются и скачиваются напрямую на ваш компьютер без сохранения на сервере. 
          Это позволяет работать с файлами любого размера и обеспечивает полную конфиденциальность.
        </AlertDescription>
      </Alert>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>История резервных копий</CardTitle>
          <CardDescription>
            Журнал созданных резервных копий (файлы скачиваются напрямую)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : !backupLogs || backupLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Резервные копии пока не создавались
            </p>
          ) : (
            <div className="space-y-4">
              {backupLogs.map((backup) => (
                <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(backup.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium flex items-center gap-2">
                          {getBackupTypeIcon(backup.backup_type)}
                          {backup.backup_type === 'database' && 'База данных'}
                          {backup.backup_type === 'storage' && 'Архив файлов'}
                          {backup.backup_type === 'full' && 'Полная копия'}
                        </span>
                        <Badge variant={getStatusBadgeVariant(backup.status)}>
                          {backup.status === 'completed' && 'Завершено'}
                          {backup.status === 'failed' && 'Ошибка'}
                          {backup.status === 'in_progress' && 'В процессе'}
                          {backup.status === 'pending' && 'Ожидание'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getBackupDescription(backup)}
                      </div>
                      {backup.error_message && (
                        <div className="text-sm text-red-600 mt-1">
                          {backup.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteBackupMutation.mutate(backup.id)}
                      disabled={deleteBackupMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBackup;
