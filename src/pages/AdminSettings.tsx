
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HeroBannerSettings from '@/components/admin/settings/HeroBannerSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-6">Настройки</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Общие</TabsTrigger>
          <TabsTrigger value="appearance">Оформление</TabsTrigger>
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
