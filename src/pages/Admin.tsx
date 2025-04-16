
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { checkAuth } from '@/services/supabaseService';
import AdminDashboard from './AdminDashboard';
import AdminProducts from './admin/AdminProducts';
import AdminBookings from './admin/AdminBookings';
import AdminCalendar from './admin/AdminCalendar';
import AdminCategories from './admin/AdminCategories';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

const Admin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAuthenticated = checkAuth();

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Панель администратора</h1>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Выйти
        </Button>
      </div>
      
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 w-full justify-start overflow-x-auto">
          <TabsTrigger value="dashboard">Обзор</TabsTrigger>
          <TabsTrigger value="products">Товары</TabsTrigger>
          <TabsTrigger value="categories">Категории</TabsTrigger>
          <TabsTrigger value="bookings">Бронирования</TabsTrigger>
          <TabsTrigger value="calendar">Календарь</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default Admin;
