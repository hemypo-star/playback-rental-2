
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkAuth, logout, getCurrentUser } from '@/services/authService';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './admin/AdminProducts';
import AdminBookings from './admin/AdminBookings';
import AdminCalendar from './admin/AdminCalendar';
import AdminCategories from './admin/AdminCategories';
import AdminSettings from './AdminSettings';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, User, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FileExplorer from '@/components/admin/FileExplorer';

export default function Admin() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<{email: string} | null>(null);
  
  useEffect(() => {
    // Check authentication on component mount
    const verifyAuth = async () => {
      const isAuthenticated = await checkAuth();
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      // Set current user
      setCurrentUser(getCurrentUser());
    };
    
    verifyAuth();
  }, [navigate]);
  
  const handleLogout = () => {
    logout();
    toast({
      title: 'Выход выполнен',
      description: 'Вы успешно вышли из системы'
    });
    navigate('/login');
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Панель администратора</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{currentUser?.email}</span>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard">Обзор</TabsTrigger>
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="bookings">Бронирования</TabsTrigger>
          <TabsTrigger value="calendar">Календарь</TabsTrigger>
          <TabsTrigger value="storage">Файлы</TabsTrigger>
          <TabsTrigger value="settings">Настройки</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard">
          <AdminDashboard />
        </TabsContent>
        
        <TabsContent value="products">
          <AdminProducts />
        </TabsContent>
        
        <TabsContent value="categories">
          <AdminCategories />
        </TabsContent>

        <TabsContent value="bookings">
          <AdminBookings />
        </TabsContent>
        
        <TabsContent value="calendar">
          <AdminCalendar />
        </TabsContent>
        
        <TabsContent value="storage">
          <FileExplorer />
        </TabsContent>
        
        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
