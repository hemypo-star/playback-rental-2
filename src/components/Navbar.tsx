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
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="96" height="96" viewBox="0 0 96 96">
                    <image xlink:href="data:image/png;base64,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" x="0" y="0" width="96" height="96"/>
                </svg>
              </a>
            </div>

            <AnimatedTransition show={isSearchOpen} type="slide-down" className="hidden md:flex items-center relative">
              <Input placeholder="Поиск оборудовани��..." className="w-60 bg-white/80 dark:bg-black/60 rounded-full pr-10" autoFocus={isSearchOpen} />
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
