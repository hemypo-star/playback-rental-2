
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listBucketFiles, getPublicUrl, testStorageConnection, resetStoragePermissions } from '@/services/storageService';
import { Button } from '@/components/ui/button';
import { Loader2, FolderOpen, Image, File, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type FileItem = {
  id: string;
  name: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

const FileExplorer = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('products');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    products: boolean;
    categories: boolean;
    loading: boolean;
  }>({
    products: false,
    categories: false,
    loading: true
  });
  
  // Check initial storage connection status
  useEffect(() => {
    checkStorageConnections();
  }, []);
  
  const checkStorageConnections = async () => {
    setConnectionStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const productsResult = await testStorageConnection('products');
      const categoriesResult = await testStorageConnection('categories');
      
      setConnectionStatus({
        products: productsResult.success,
        categories: categoriesResult.success,
        loading: false
      });
      
      if (!productsResult.success || !categoriesResult.success) {
        toast({
          title: "Проблема с хранилищем",
          description: "Некоторые хранилища недоступны. Попробуйте сбросить разрешения.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error checking storage connections:", error);
      setConnectionStatus({
        products: false,
        categories: false,
        loading: false
      });
    }
  };
  
  const resetPermissions = async () => {
    setIsResetting(true);
    try {
      const result = await resetStoragePermissions();
      
      if (result) {
        toast({
          title: "Успешно",
          description: "Разрешения хранилища успешно сброшены",
        });
        
        // Verify connections again
        await checkStorageConnections();
        
        // Reload files for current tab
        await fetchFiles(activeTab);
      } else {
        toast({
          title: "Ошибка",
          description: "Не удалось сбросить разрешения хранилища",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error resetting storage permissions:", error);
      toast({
        title: "Ошибка",
        description: "Произошла ошибка при сбросе разрешений",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  const fetchFiles = async (bucketName: string) => {
    setIsLoading(true);
    try {
      const filesList = await listBucketFiles(bucketName);
      console.log(`Files from ${bucketName}:`, filesList);
      setFiles(filesList);
    } catch (error) {
      console.error(`Error fetching files from ${bucketName}:`, error);
      toast({
        title: "Ошибка",
        description: `Не удалось загрузить файлы из хранилища ${bucketName}`,
        variant: "destructive"
      });
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchFiles(activeTab);
  }, [activeTab]);
  
  const handleRefresh = () => {
    fetchFiles(activeTab);
  };
  
  const isImageFile = (fileName: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return imageExtensions.includes(ext);
  };
  
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    
    if (bytes < 1024) return `${bytes} B`;
    else if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    else return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Файловый менеджер</CardTitle>
            <CardDescription>Просмотр и управление файлами в хранилище</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={resetPermissions}
              disabled={isResetting || connectionStatus.loading}
            >
              {isResetting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Сбросить разрешения
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefresh} 
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Обновить'
              )}
            </Button>
          </div>
        </div>
        
        {/* Connection status indicators */}
        <div className="flex gap-4 mt-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus.products ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">Products: {connectionStatus.products ? 'Доступно' : 'Недоступно'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus.categories ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm">Categories: {connectionStatus.categories ? 'Доступно' : 'Недоступно'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="products">Товары</TabsTrigger>
            <TabsTrigger value="categories">Категории</TabsTrigger>
          </TabsList>
          
          <TabsContent value="products" className="space-y-4">
            {renderFileList('products')}
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            {renderFileList('categories')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
  
  function renderFileList(bucketName: string) {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (files.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Папка пуста</p>
          <p className="text-muted-foreground">В этой папке нет файлов</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {files.map((file) => {
          const isImage = isImageFile(file.name);
          const publicUrl = isImage ? getPublicUrl(bucketName, file.name) : null;
          
          return (
            <div key={file.id} className="border rounded-md p-2 flex flex-col">
              <div className="h-32 flex items-center justify-center bg-muted rounded-md mb-2">
                {isImage && publicUrl ? (
                  <div 
                    className="w-full h-full bg-center bg-cover bg-no-repeat"
                    style={{ backgroundImage: `url(${publicUrl})` }}
                  />
                ) : (
                  <File className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              
              <div className="mt-auto">
                <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.metadata?.size)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
};

export default FileExplorer;
