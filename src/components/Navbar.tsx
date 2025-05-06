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

  // Add an effect to scroll to top on route changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

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
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path 
                    fillRule="evenodd" 
                    clipRule="evenodd" 
                    d="M23.4493 5.94799C23.6161 5.40154 23.4493 5 22.6553 5H20.0297C19.3621 5 19.0543 5.34687 18.8874 5.72936C18.8874 5.72936 17.5521 8.92607 15.6606 11.0025C15.0487 11.6036 14.7705 11.7949 14.4367 11.7949C14.2698 11.7949 14.0194 11.6036 14.0194 11.0572V5.94799C14.0194 5.29225 13.8345 5 13.2781 5H9.15213C8.73494 5 8.48403 5.30434 8.48403 5.59278C8.48403 6.21441 9.42974 6.35777 9.52722 8.10641V11.9042C9.52722 12.7368 9.37413 12.8878 9.04032 12.8878C8.15023 12.8878 5.98507 9.67682 4.70093 6.00261C4.44927 5.28847 4.19686 5 3.52583 5H0.900218C0.150044 5 0 5.34687 0 5.72936C0 6.41244 0.890141 9.80039 4.14464 14.2812C6.31429 17.3412 9.37118 19 12.1528 19C13.8218 19 14.0283 18.6316 14.0283 17.997V15.6842C14.0283 14.9474 14.1864 14.8003 14.7149 14.8003C15.1043 14.8003 15.7719 14.9916 17.3296 16.467C19.1099 18.2156 19.4034 19 20.4047 19H23.0304C23.7805 19 24.1556 18.6316 23.9392 17.9045C23.7024 17.1799 22.8525 16.1286 21.7247 14.8823C21.1127 14.1719 20.1947 13.4069 19.9165 13.0243C19.5271 12.5326 19.6384 12.314 19.9165 11.8769C19.9165 11.8769 23.1155 7.45067 23.4493 5.94799Z" 
                    fill="currentColor"
                  />
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
                    <a href="https://vk.com/yourcompany" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
                        <path d="M2.00053 5.5H5.50053C5.50053 13.5 10.0005 14.5 10.0005 14.5L10.0015 5.5H13.5015L13.4995 10.5C17.9995 8.5 18.4995 5.5 18.4995 5.5H21.9995C21.9995 5.5 20.9995 10 17.0926 12.1534C19.1115 13.3511 21.2684 15.3315 21.9995 18.5H18.4995C18.4995 18.5 17.4995 15.5 13.4995 14L13.5015 18.5C1.88755 18.5 2.00232 7.5 2.00053 5.5Z" />
                      </svg>
                    </a>
                    
                    <a href="https://t.me/yourcompany" target="_blank" rel="noopener noreferrer" className="text-foreground hover:text-primary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" color="#000000" fill="none">
                        <path d="M11.9854 15.4083L15.2268 19.0936C16.4277 20.4589 17.0282 21.1416 17.6567 20.9754C18.2852 20.8092 18.5008 19.9108 18.9318 18.1138L21.3229 8.1459C21.9868 5.37832 22.3187 3.99454 21.5808 3.312C20.843 2.62947 19.564 3.13725 17.0061 4.15282L5.13876 8.86449C3.09293 9.67674 2.07001 10.0829 2.00507 10.7808C1.99842 10.8522 1.99831 10.9241 2.00474 10.9955C2.06754 11.6937 3.08921 12.1033 5.13255 12.9223C6.05838 13.2934 6.5213 13.479 6.8532 13.8344C6.89052 13.8743 6.9264 13.9157 6.96078 13.9584C7.26658 14.3384 7.39709 14.8371 7.65808 15.8344L8.14653 17.701C8.4005 18.6715 8.52749 19.1568 8.86008 19.223C9.19267 19.2891 9.48225 18.8867 10.0614 18.0819L11.9854 15.4083ZM11.9854 15.4083L11.6676 15.0771C11.3059 14.7001 11.1251 14.5117 11.1251 14.2775C11.1251 14.0433 11.3059 13.8548 11.6676 13.4778L15.2406 9.75409" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
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
