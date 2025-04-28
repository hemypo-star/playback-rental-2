
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Upload, Loader2 } from 'lucide-react';
import * as supabaseService from '@/services/supabaseService';

export default function ImportExport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const csvContent = await supabaseService.exportProductsToCSV();
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Экспорт завершен',
        description: 'Файл CSV успешно скачан',
      });
    } catch (error) {
      toast({
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать товары',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCSV = async () => {
    if (!csvFile) {
      toast({
        title: 'Ошибка',
        description: 'Выберите файл CSV для импорта',
        variant: 'destructive',
      });
      return;
    }
    
    setIsImporting(true);
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        await supabaseService.importProductsFromCSV(text);
        
        queryClient.invalidateQueries({ queryKey: ['products'] });
        toast({
          title: 'Импорт завершен',
          description: 'Товары успешно импортированы',
        });
        
        setCsvFile(null);
        setIsImporting(false);
      };
      
      reader.onerror = () => {
        toast({
          title: 'Ошибка чтения файла',
          description: 'Не удалось прочитать файл CSV',
          variant: 'destructive',
        });
        setIsImporting(false);
      };
      
      reader.readAsText(csvFile);
    } catch (error) {
      toast({
        title: 'Ошибка импорта',
        description: 'Не удалось импортировать товары',
        variant: 'destructive',
      });
      setIsImporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Экспорт товаров</CardTitle>
          <CardDescription>
            Экспортируйте все товары в формате CSV для резервного копирования или редактирования.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleExportCSV} 
            disabled={isExporting}
            className="w-full"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Экспортировать в CSV
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Импорт товаров</CardTitle>
          <CardDescription>
            Импортируйте товары из CSV файла. Формат должен соответствовать экспортированному файлу.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              disabled={isImporting}
            />
          </div>
          <Button 
            onClick={handleImportCSV} 
            disabled={!csvFile || isImporting}
            className="w-full"
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Импорт...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Импортировать из CSV
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
