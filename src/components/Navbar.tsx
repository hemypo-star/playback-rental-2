
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
               <svg viewBox="0 0 96 96" version="1.1" xmlns="http://www.w3.org/2000/svg" ><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 40.5 24 L 44 24.5 L 40.5 25 L 40.5 24 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 90.5 28 L 89.5 30 L 90.5 28 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 95.5 28 L 94.5 30 L 95.5 28 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 88.5 31 L 87.5 33 L 88.5 31 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 35.5 32 L 36 34.5 L 35 34.5 L 35.5 32 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 70.5 32 L 69.5 34 L 70.5 32 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 92.5 33 L 91.5 35 L 92.5 33 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 68.5 35 L 67.5 37 L 68.5 35 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 8.5 36 L 9.5 38 L 8.5 36 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 90.5 36 L 89.5 38 L 90.5 36 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 72.5 37 L 71.5 39 L 72.5 37 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 65.5 39 L 64.5 41 L 65.5 39 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 88.5 39 L 87.5 41 L 88.5 39 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 22.5 40 L 23.5 42 L 22.5 40 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 6.5 41 L 7.5 43 L 6.5 41 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 11.5 41 L 12.5 43 L 11.5 41 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 28.5 41 L 29.5 43 L 28.5 41 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 69.5 41 L 68.5 43 L 69.5 41 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 86.5 42 L 85.5 44 L 86.5 42 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 24.5 43 L 25.5 45 L 24.5 43 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 56.5 43 L 57 45.5 L 56 45.5 L 56.5 43 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 13.5 44 L 14.5 46 L 13.5 44 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 35.5 44 L 36 48 L 34 47.5 L 35.5 44 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 61.5 44 L 58.5 48 L 57 47.5 L 61.5 44 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 79.5 45 L 78.5 47 L 79.5 45 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 84.5 45 L 83.5 47 L 84.5 45 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 65.5 46 L 62.5 50 L 65.5 46 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 27.5 47 L 29.5 50 L 27.5 47 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 16.5 48 L 17.5 50 L 16.5 48 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 53.5 49 L 55.5 52 L 53.5 49 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 12.5 50 L 13.5 52 L 12.5 50 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 31.5 50 L 34 51.5 L 32.5 52 L 31.5 50 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 81.5 50 L 80.5 52 L 81.5 50 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 19.5 52 L 20.5 54 L 19.5 52 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 81.5 53 L 83.5 56 L 81.5 53 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 15.5 54 L 16.5 56 L 15.5 54 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 77.5 55 L 79.5 58 L 77.5 55 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 23.5 57 L 31.5 66 L 23.5 57 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 19.5 59 L 29.5 70 L 19.5 59 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 86.5 59 L 90.5 64 L 86.5 59 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 55.5 60 L 54 62.5 L 53.5 64 L 53 62.5 L 55.5 60 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 82.5 61 L 86.5 66 L 82.5 61 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 67.5 64 L 69.5 67 L 67.5 64 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 61.5 65 L 62.5 67 L 61.5 65 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 34.5 67 L 35.5 69 L 34.5 67 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 52.5 67 L 53 70.5 L 52 70.5 L 52.5 67 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 93.5 67 L 94.5 69 L 93.5 67 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 65.5 68 L 67.5 71 L 65.5 68 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 73.5 69 L 75.5 72 L 73.5 69 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 89.5 69 L 91 71.5 L 90 71.5 L 89.5 69 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 32.5 71 L 33.5 73 L 32.5 71 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 71.5 73 L 72.5 75 L 71.5 73 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.1843137254901961" d="M 55.5 74 L 54.5 76 L 55.5 74 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0" d="M 0 0 L 95.5 0 L 96 0.5 L 96 24 L 74.5 24 L 74 25.5 Q 68.2 38.2 58.5 47 Q 55.5 47.9 57 43.5 L 56 42.5 L 56 21 L 53.5 20 L 38.5 20 L 33 22 L 32 28 Q 34.7 26.9 34 29.5 Q 37 34.5 36 43.5 L 35 47 L 30 43.5 L 20 24 L 0 24 L 0 0 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0" d="M 44.5 24 Q 49.9 23.4 52 25 L 52 47.5 L 55.5 52 L 59.5 52 L 66 46.5 L 78.5 28 L 90 28.5 L 78 46.5 L 76 53.5 L 89 68.5 L 90 72 L 76.5 72 L 61.5 60 L 55.5 60 L 53 62.5 L 52 72 Q 41.9 73.3 36.5 69 L 21 54.5 Q 11.3 43.3 5 28.5 L 15.5 28 Q 20.7 40.8 29.5 50 Q 31.5 53 37.5 52 L 40 49.5 L 40 30.5 L 38 25 L 44.5 24 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0" d="M 0.5 29 Q 10.6 53.9 29.5 70 L 39.5 76 L 54.5 76 L 57 72.5 Q 55.9 66.4 58.5 64 L 74.5 76 L 93.5 76 L 96 74.5 L 96 95.5 L 95.5 96 L 0 96 L 0.5 29 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0" d="M 95.5 29 L 96 69.5 L 95 69.5 L 81 51.5 L 95.5 29 Z " /><path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="0.9490196078431372" d="M 40.5 20 L 52.5 20 L 56 22.5 L 56 45.5 L 57 48 L 62 44.5 L 75.5 24 L 94.5 24 L 96 25.5 L 93 32.5 L 80 51.5 L 93 66.5 L 96 73.5 L 92.5 76 L 74.5 76 L 61.5 65 L 57 64 Q 58.4 72.5 53.5 76 Q 40.7 77.8 34.5 73 L 17 56.5 Q 5.6 43.9 0 25.5 L 1.5 24 L 18.5 24 L 26 38.5 L 34.5 48 L 36 47.5 L 36 32.5 L 32 24.5 L 34.5 22 L 40.5 20 Z M 41 24 L 37 26 L 40 33 L 40 48 L 38 52 L 31 50 Q 22 42 17 30 L 17 28 L 5 28 L 5 31 L 11 42 L 23 58 L 36 69 Q 40 74 52 72 Q 54 70 53 65 L 57 60 L 63 61 L 76 72 L 91 72 L 76 53 Q 82 39 91 29 L 77 28 Q 75 37 68 44 L 61 51 L 57 52 L 52 46 L 52 24 L 41 24 Z " /></svg>
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
