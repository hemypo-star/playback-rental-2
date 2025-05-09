
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { listBucketFiles, getPublicUrl } from '@/services/storageService';
import { Button } from '@/components/ui/button';
import { Loader2, FolderOpen, Image, File, FileX } from 'lucide-react';

type FileItem = {
  id: string;
  name: string;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

const FileExplorer = () => {
  const [activeTab, setActiveTab] = useState('products');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchFiles = async (bucketName: string) => {
    setIsLoading(true);
    try {
      const filesList = await listBucketFiles(bucketName);
      setFiles(filesList);
    } catch (error) {
      console.error(`Error fetching files from ${bucketName}:`, error);
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
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Обновить'}
          </Button>
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
