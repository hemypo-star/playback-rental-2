
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  SearchIcon, 
  MenuIcon, 
  ShoppingCartIcon, 
  XIcon, 
  Phone, 
  Send,
  Facebook 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AnimatedTransition from './AnimatedTransition';
import { cn } from '@/lib/utils';
import { checkAuth } from '@/services/apiService';
import { useCartContext } from '@/hooks/useCart';

const Navbar = () => {
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const isAuthenticated = checkAuth();
  const {
    cartCount
  } = useCartContext();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 py-4 transition-all duration-300 backdrop-blur-md', 
      isScrolled ? 'bg-white/70 dark:bg-black/70 shadow-soft' : 'bg-white bg-opacity-90'
    )}>
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity flex items-center">
              <img src="/logo.svg" alt="PlayBack Rental" className="h-8 mr-2" onError={e => {
                e.currentTarget.style.display = 'none';
              }} />
              <span>Playback Rental</span>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-8">
              <NavLink to="/" active={isActive('/')}>Главная</NavLink>
              <NavLink to="/catalog" active={isActive('/catalog')}>Каталог</NavLink>
              <NavLink to="/how-it-works" active={isActive('/how-it-works')}>Как это работает</NavLink>
              <NavLink to="/contact" active={isActive('/contact')}>Контакты</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-4 mr-4">
              <a href="tel:+79001234567" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Phone className="h-4 w-4" />
                +7 (900) 123-45-67
              </a>
              <a href="https://t.me/yourcompany" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Send className="h-4 w-4" />
              </a>
              <a href="https://vk.com/playbackkem" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700">
                {/* Replacing the SVG with a simpler VK icon that doesn't use XML namespaces */}
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M3 8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"></path>
                  <path d="M7 10.5h1.5L12 16l3.5-5.5H17"></path>
                </svg>
              </a>
            </div>

            <AnimatedTransition show={isSearchOpen} type="slide-down" className="hidden md:flex items-center relative">
              <Input placeholder="Поиск оборудования..." className="w-60 bg-white/80 dark:bg-black/60 rounded-full pr-10" autoFocus={isSearchOpen} />
              <XIcon className="absolute right-3 h-4 w-4 text-muted-foreground cursor-pointer" onClick={() => setIsSearchOpen(false)} />
            </AnimatedTransition>

            <Link to="/checkout">
              <Button variant="ghost" size="icon" className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 relative">
                <ShoppingCartIcon className="h-5 w-5" />
                {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>}
              </Button>
            </Link>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 md:hidden">
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="glass-panel w-full max-w-xs">
                <div className="flex flex-col gap-8 mt-8">
                  <Link to="/" className="text-xl font-semibold tracking-tight flex items-center">
                    <img src="/logo.svg" alt="PlayBack Rental" className="h-8 mr-2" onError={e => {
                      e.currentTarget.style.display = 'none';
                    }} />
                    <span>Playback Rental</span>
                  </Link>
                  <nav className="flex flex-col space-y-6">
                    <Link to="/" className="text-foreground hover:text-primary transition-colors">Главная</Link>
                    <Link to="/catalog" className="text-foreground hover:text-primary transition-colors">Каталог</Link>
                    <Link to="/how-it-works" className="text-foreground hover:text-primary transition-colors">Как это работает</Link>
                    <Link to="/contact" className="text-foreground hover:text-primary transition-colors">Контакты</Link>
                    {isAuthenticated && <Link to="/admin" className="text-foreground hover:text-primary transition-colors">
                        Админ-панель
                      </Link>}
                  </nav>
                </div>
                <div className="flex flex-col space-y-4 mt-4">
                  <a href="tel:+79001234567" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
                    <Phone className="h-4 w-4" />
                    +7 (900) 123-45-67
                  </a>
                  <div className="flex items-center gap-4">
                    <a href="https://t.me/yourcompany" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
                      <Send className="h-4 w-4" />
                    </a>
                    <a href="https://vk.com/yourcompany" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
                      <Facebook className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

interface NavLinkProps {
  to: string;
  active: boolean;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({
  to,
  active,
  children
}) => {
  return (
    <Link to={to} className={cn("relative py-1 font-medium transition-colors", active ? "text-foreground" : "text-foreground/70 hover:text-foreground")}>
      {children}
      {active && <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full animate-in-up" />}
    </Link>
  );
};

export default Navbar;
