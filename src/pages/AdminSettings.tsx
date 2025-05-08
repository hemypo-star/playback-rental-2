
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HeroBannerSettings from '@/components/admin/settings/HeroBannerSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createBucketIfNotExists, checkBucketsExist } from '@/services/supabaseClient';
import { resetStoragePermissions } from '@/services/storageService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();
  const [isCreatingBuckets, setIsCreatingBuckets] = useState(false);
  const [isUsingEdgeFunction, setIsUsingEdgeFunction] = useState(false);
  const [bucketsStatus, setBucketsStatus] = useState<{ products: boolean; categories: boolean } | null>(null);

  // Check buckets status on component mount
  useEffect(() => {
    const fetchBucketsStatus = async () => {
      try {
        const status = await checkBucketsExist();
        setBucketsStatus(status);
      } catch (error) {
        console.error('Error checking buckets status:', error);
      }
    };

    fetchBucketsStatus();
  }, []);

  const ensureStorageBuckets = async () => {
    try {
      setIsCreatingBuckets(true);
      
      // Try creating both buckets, handling errors for each independently
      try {
        await createBucketIfNotExists('products', true);
      } catch (error: any) {
        console.error('Error creating products bucket:', error);
        toast({
          title: 'Ошибка',
          description: `Не удалось создать хранилище товаров: ${error.message}`,
          variant: 'destructive'
        });
      }
      
      try {
        await createBucketIfNotExists('categories', true);
      } catch (error: any) {
        console.error('Error creating categories bucket:', error);
        toast({
          title: 'Ошибка',
          description: `Не удалось создать хранилище категорий: ${error.message}`,
          variant: 'destructive'
        });
      }
      
      // Refresh bucket status
      const status = await checkBucketsExist();
      setBucketsStatus(status);
      
      // Show success if both buckets exist now
      if (status.products && status.categories) {
        toast({
          title: 'Хранилище настроено',
          description: 'Хранилища для товаров и категорий успешно настроены.'
        });
      } else {
        toast({
          title: 'Внимание',
          description: 'Некоторые хранилища не удалось настроить. Попробуйте использовать сервисную функцию.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error ensuring storage buckets exist:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось настроить хранилище.',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingBuckets(false);
    }
  };

  const handleStorageSetupWithEdgeFunction = async () => {
    try {
      setIsUsingEdgeFunction(true);
      
      const result = await resetStoragePermissions();
      
      if (result) {
        // Refresh the bucket status after successful operation
        const status = await checkBucketsExist();
        setBucketsStatus(status);
        
        toast({
          title: 'Хранилище настроено',
          description: 'Хранилища для товаров и категорий успешно настроены через сервисную функцию.'
        });
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось настроить хранилище через сервисную функцию.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error using edge function for storage setup:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при использовании сервисной функции.',
        variant: 'destructive'
      });
    } finally {
      setIsUsingEdgeFunction(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Настройки</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Общие</TabsTrigger>
          <TabsTrigger value="appearance">Оформление</TabsTrigger>
          <TabsTrigger value="storage">Хранилище</TabsTrigger>
          <TabsTrigger value="advanced">Расширенные</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <div className="space-y-6">
            <p className="text-muted-foreground">Здесь будут общие настройки системы</p>
          </div>
        </TabsContent>
        
        <TabsContent value="appearance">
          <div className="space-y-6">
            <HeroBannerSettings />
          </div>
        </TabsContent>
        
        <TabsContent value="storage">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Хранилище файлов</CardTitle>
                <CardDescription>
                  Управление хранилищем для изображений товаров и категорий
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Настройка хранилища</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Нажмите кнопку ниже, чтобы настроить хранилища для товаров и категорий.
                    </p>
                    
                    {bucketsStatus && (
                      <div className="mb-4 grid gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${bucketsStatus.products ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span>Хранилище товаров: {bucketsStatus.products ? 'Настроено' : 'Не настроено'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${bucketsStatus.categories ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span>Хранилище категорий: {bucketsStatus.categories ? 'Настроено' : 'Не настроено'}</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="space-y-4">
                      <Button 
                        onClick={ensureStorageBuckets} 
                        disabled={isCreatingBuckets || isUsingEdgeFunction}
                      >
                        {isCreatingBuckets && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isCreatingBuckets ? 'Настройка...' : 'Настроить хранилище'}
                      </Button>
                      
                      <div className="pt-4 border-t">
                        <h4 className="text-sm font-medium mb-2">Альтернативный способ</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Если основной способ не работает, попробуйте использовать сервисную функцию.
                        </p>
                        <Button 
                          onClick={handleStorageSetupWithEdgeFunction}
                          variant="outline" 
                          disabled={isCreatingBuckets || isUsingEdgeFunction}
                        >
                          {isUsingEdgeFunction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isUsingEdgeFunction ? 'Настройка...' : 'Использовать сервисную функцию'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="advanced">
          <div className="space-y-6">
            <p className="text-muted-foreground">Здесь будут расширенные настройки системы</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
