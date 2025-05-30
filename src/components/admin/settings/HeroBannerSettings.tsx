
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import ImageUploadField from '@/components/ImageUploadField';
import { Loader2 } from 'lucide-react';

const HeroBannerSettings = () => {
  const { toast } = useToast();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка текущего изображения из настроек
  useEffect(() => {
    const fetchCurrentBanner = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('key', 'hero_banner_image')
          .single();

        if (error) {
          console.error('Error fetching banner settings:', error);
          return;
        }

        if (data?.value) {
          setImageUrl(data.value);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentBanner();
  }, []);

  const handleImageChange = (url: string) => {
    setImageUrl(url);
  };

  const handleSave = async () => {
    if (!imageUrl) {
      toast({
        title: 'Ошибка',
        description: 'Сначала введите URL изображения',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);

      // Update setting in database
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({ 
          key: 'hero_banner_image',
          value: imageUrl,
          updated_at: new Date().toISOString()
        });

      if (settingsError) {
        throw new Error(settingsError.message);
      }

      toast({
        title: 'Успешно',
        description: 'Баннер главной страницы обновлен',
      });

    } catch (error: any) {
      toast({
        title: 'Ошибка при сохранении',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Баннер главной страницы</CardTitle>
        <CardDescription>
          Введите URL изображения для баннера главной страницы. 
          Рекомендуемый размер: 1920x1080px.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="hero-banner">URL изображения баннера</Label>
            <div className="mt-2">
              <ImageUploadField
                onChange={handleImageChange}
                previewUrl={imageUrl}
                disabled={isLoading}
              />
            </div>
          </div>

          {imageUrl && (
            <div className="mt-4">
              <Label>Предпросмотр</Label>
              <div className="mt-2 relative w-full h-[200px] overflow-hidden rounded-md border">
                <img
                  src={imageUrl}
                  alt="Предпросмотр баннера"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={!imageUrl || isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
      </CardFooter>
    </Card>
  );
};

export default HeroBannerSettings;
