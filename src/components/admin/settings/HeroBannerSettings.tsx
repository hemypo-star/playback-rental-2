
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка текущего изображения из настроек
  useEffect(() => {
    const fetchCurrentBanner = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'hero_banner_image')
          .single();

        if (error) {
          console.error('Error fetching banner settings:', error);
          return;
        }

        if (data) {
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

  const handleImageChange = (file: File) => {
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
  };

  const handleSave = async () => {
    if (!imageFile) {
      toast({
        title: 'Ошибка',
        description: 'Сначала выберите изображение',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Загрузка файла в storage
      const fileName = `hero_banner_${Date.now()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('products')
        .upload(fileName, imageFile);
      
      if (uploadError) {
        throw new Error(uploadError.message);
      }

      // Получение публичной ссылки
      const { data: publicUrlData } = supabase.storage
        .from('products')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      // Обновление настройки в базе данных
      const { error: settingsError } = await supabase
        .from('settings')
        .upsert({ 
          key: 'hero_banner_image',
          value: publicUrl
        });

      if (settingsError) {
        throw new Error(settingsError.message);
      }

      toast({
        title: 'Успешно',
        description: 'Баннер главной страницы обновлен',
      });

      setImageUrl(publicUrl);
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
          Загрузите изображение для баннера главной страницы. 
          Рекомендуемый размер: 1920x1080px.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="hero-banner">Изображение баннера</Label>
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
          disabled={!imageFile || isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Сохранить
        </Button>
      </CardFooter>
    </Card>
  );
};

export default HeroBannerSettings;
