
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HeroBannerSettings from '@/components/admin/settings/HeroBannerSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createBucketIfNotExists } from '@/services/supabaseClient';
import { useToast } from '@/hooks/use-toast';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("general");
  const { toast } = useToast();
  const [isCreatingBuckets, setIsCreatingBuckets] = useState(false);

  const ensureStorageBuckets = async () => {
    try {
      setIsCreatingBuckets(true);
      await createBucketIfNotExists('products');
      await createBucketIfNotExists('categories');
      toast({
        title: 'Хранилище настроено',
        description: 'Хранилища для товаров и категорий успешно настроены.'
      });
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
                      Нажмите кнопку ниже, чтобы убедиться, что хранилища для товаров и категорий правильно настроены.
                    </p>
                    <Button 
                      onClick={ensureStorageBuckets} 
                      disabled={isCreatingBuckets}
                    >
                      {isCreatingBuckets ? 'Настройка...' : 'Настроить хранилище'}
                    </Button>
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
