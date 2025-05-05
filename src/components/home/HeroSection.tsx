
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRightIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingCalendar } from '@/components/BookingCalendar';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import type { BookingPeriod } from '@/types/product';

export const HeroSection = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [searchQuery, setSearchQuery] = useState('');
  const [bannerImage, setBannerImage] = useState('public/BG.svg');

  useEffect(() => {
    const fetchBannerImage = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'hero_banner_image')
          .single();
        
        if (!error && data?.value) {
          setBannerImage(data.value);
        }
      } catch (error) {
        console.error('Error fetching banner image:', error);
      }
    };

    fetchBannerImage();
  }, []);

  const handleBookingChange = (bookingData: BookingPeriod) => {
    setStartDate(bookingData.startDate);
    setEndDate(bookingData.endDate);
  };

  const handleSearchClick = () => {
    if (startDate && endDate) {
      navigate('/catalog', { 
        state: { 
          startDate, 
          endDate 
        } 
      });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/catalog', { 
      state: { 
        search: searchQuery,
        scrollTop: true
      } 
    });
  };

  return (
    <section className="relative h-screen max-h-[800px] flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-black/70 to-black/40" />
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${bannerImage}')` }}
      />
      
      <div className="container relative z-10 px-4 py-16 mx-auto">
        <div className="max-w-xl">
          <h1 className="heading-1 text-white mb-6">Playback Rental</h1>
          <p className="text-xl text-white/90 mb-8">
            Современная и профессиональная фото- и видеотехника, включая новейшие модели и классические решения, доступные для аренды на гибких и выгодных условиях.
          </p>
          
          <div className="w-full glass-panel p-4 rounded-xl">
            <h2 className="text-lg font-medium mb-3">Найдите доступное оборудование</h2>
            
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex-grow md:flex-grow-0 bg-white/90 text-foreground min-w-[240px] justify-between h-10"
                  >
                    {startDate && endDate 
                      ? `${format(startDate, 'dd.MM.yyyy HH:00')} - ${format(endDate, 'dd.MM.yyyy HH:00')}`
                      : "Выберите дату и время"}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2" align="start" sideOffset={5}>
                  <BookingCalendar
                    onBookingChange={handleBookingChange}
                    initialStartDate={startDate}
                    initialEndDate={endDate}
                    isCompact={true}
                  />
                </PopoverContent>
              </Popover>
              
              {startDate && endDate && (
                <Button 
                  className="flex-grow md:flex-grow-0 bg-primary text-primary-foreground hover:bg-primary/90" 
                  onClick={handleSearchClick}
                >
                  Перейти в каталог
                </Button>
              )}
            </div>
            
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="text"
                placeholder="Поиск по названию или описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 h-10"
              />
              <Button 
                type="submit" 
                size="icon" 
                className="absolute right-1 top-1 h-8 w-8"
                disabled={!searchQuery.trim()}
              >
                <SearchIcon className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
