
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, X, ShoppingCart, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartContext } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { cartItems } = useCartContext();
  const { user } = useAuth();
  const router = useRouter();
  const cartItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [router.pathname]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const NavLink = ({
    href,
    children,
    className = ""
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <Link
      href={href}
      className={`text-foreground hover:text-primary transition-colors ${className}`}
      onClick={() => setIsOpen(false)}
    >
      {children}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Name */}
          <Link href="/" className="flex items-center space-x-3">
            <img src="/logo.svg" alt="PlayBack Rental" className="h-8 w-auto" />
            <span className="font-semibold text-lg">Playback Rental</span>
          </Link>

          {/* Right side - Navigation, Cart, Social Icons */}
          <div className="flex items-center space-x-6">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <NavLink href="/catalog">Каталог</NavLink>
              <NavLink href="/how-it-works">Как это работает</NavLink>
              <NavLink href="/contact">Контакты</NavLink>
            </div>

            {/* Cart Icon */}
            <Link href="/checkout" className="relative">
              <Button variant="ghost" size="sm" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full text-xs w-5 h-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Social Icons - Desktop */}
            <div className="hidden lg:flex items-center space-x-4 ml-8">
              <div className="flex items-center gap-2">
                <a href="https://vk.com/playbackrental" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                    <path d="M2.00053 5.5H5.50053C5.50053 13.5 10.0005 14.5 10.0005 14.5L10.0015 5.5H13.5015L13.4995 10.5C17.9995 8.5 18.4995 5.5 18.4995 5.5H21.9995C21.9995 5.5 20.9995 10 17.0926 12.1534C19.1115 13.3511 21.2684 15.3315 21.9995 18.5H18.4995C18.4995 18.5 17.4995 15.5 13.4995 14L13.5015 18.5C1.88755 18.5 2.00232 7.5 2.00053 5.5Z" />
                  </svg>
                </a>
                <a href="https://t.me/playbackrental" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                  <Send className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Admin Panel Button - Only for logged in users */}
            {user && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin">Панель управления</Link>
              </Button>
            )}

            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={toggleMenu}>
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <NavLink href="/catalog" className="block px-3 py-2 rounded-md">
                Каталог
              </NavLink>
              <NavLink href="/how-it-works" className="block px-3 py-2 rounded-md">
                Как это работает
              </NavLink>
              <NavLink href="/contact" className="block px-3 py-2 rounded-md">
                Контакты
              </NavLink>
              
              {/* Social Icons - Mobile */}
              <div className="px-3 py-2 border-t mt-2 pt-2 space-y-2">
                <div className="flex items-center gap-3 pt-1">
                  <a href="https://vk.com/playbackrental" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                      <path d="M2.00053 5.5H5.50053C5.50053 13.5 10.0005 14.5 10.0005 14.5L10.0015 5.5H13.5015L13.4995 10.5C17.9995 8.5 18.4995 5.5 18.4995 5.5H21.9995C21.9995 5.5 20.9995 10 17.0926 12.1534C19.1115 13.3511 21.2684 15.3315 21.9995 18.5H18.4995C18.4995 18.5 17.4995 15.5 13.4995 14L13.5015 18.5C1.88755 18.5 2.00232 7.5 2.00053 5.5Z" />
                    </svg>
                  </a>
                  <a href="https://t.me/playbackrental" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Send className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
