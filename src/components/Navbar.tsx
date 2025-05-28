import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Menu, ShoppingCart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCartContext } from '@/hooks/useCart';
export const Navbar = () => {
  const {
    user,
    signOut
  } = useAuth();
  const {
    cartCount
  } = useCartContext();
  const location = useLocation();
  const [isCatalogPage, setIsCatalogPage] = useState(false);
  useEffect(() => {
    setIsCatalogPage(location.pathname === '/catalog');
  }, [location]);
  return <nav className="bg-white border-b border-border sticky top-0 z-50 h-20">
      <div className="container mx-auto px-4 h-full">
        <div className="flex items-center justify-between h-full">
          <Link to="/" className="flex items-center space-x-2">
            <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
            <span className="text-xl py-[6px] font-medium my-0">Playback Rental</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-primary transition-colors duration-200">
              Главная
            </Link>
            <Link to="/catalog" className="hover:text-primary transition-colors duration-200">
              Каталог
            </Link>
            <Link to="/how-it-works" className="hover:text-primary transition-colors duration-200">Как мы работаем</Link>
            <Link to="/contact" className="hover:text-primary transition-colors duration-200">
              Контакты
            </Link>
            
            <Link to="/checkout" className="relative hover:text-primary transition-colors duration-200">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {cartCount}
                </span>}
            </Link>
            
            {user && <div className="flex items-center space-x-4">
                <Link to="/profile">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Link>
                <Button variant="outline" size="sm" onClick={signOut}>Выйти</Button>
              </div>}
          </div>

          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <SheetHeader>
                <SheetTitle>Меню</SheetTitle>
                <SheetDescription>
                  Навигация
                </SheetDescription>
              </SheetHeader>
              <div className="grid gap-4 py-4">
                <Link to="/" className="hover:text-primary transition-colors duration-200">
                  Главная
                </Link>
                <Link to="/catalog" className="hover:text-primary transition-colors duration-200">
                  Каталог
                </Link>
                <Link to="/how-it-works" className="hover:text-primary transition-colors duration-200">
                  Как это работает
                </Link>
                <Link to="/contact" className="hover:text-primary transition-colors duration-200">
                  Контакты
                </Link>
                
                <Link to="/checkout" className="flex items-center gap-2 hover:text-primary transition-colors duration-200">
                  <ShoppingCart className="h-4 w-4" />
                  Корзина
                  {cartCount > 0 && <span className="bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {cartCount}
                    </span>}
                </Link>
                
                {user && <div className="flex flex-col space-y-4">
                    <Link to="/profile">
                      Профиль
                    </Link>
                    <Button variant="outline" size="sm" onClick={signOut}>Выйти</Button>
                  </div>}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>;
};