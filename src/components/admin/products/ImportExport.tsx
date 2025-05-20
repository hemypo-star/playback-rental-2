
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useProductImportExport } from '@/hooks/product/useProductImportExport';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ImportExport() {
  const { isLoading, handleExport, handleImport } = useProductImportExport();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    
    if (!file) {
      return;
    }
    
    // Validate file type
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setFileError('Пожалуйста, выберите файл CSV');
      return;
    }
    
    setCsvFile(file);
  };

  const handleImportClick = async () => {
    if (!csvFile) {
      setFileError('Выберите файл CSV для импорта');
      return;
    }
    
    try {
      await handleImport(csvFile);
      setCsvFile(null);
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error('Error during import:', error);
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
            onClick={handleExport} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
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
            Новые категории будут созданы автоматически.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fileError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>
          
          <Button 
            onClick={handleImportClick} 
            disabled={!csvFile || isLoading}
            className="w-full"
          >
            {isLoading ? (
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
