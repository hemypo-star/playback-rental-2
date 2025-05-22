
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Upload, Loader2, AlertCircle, FileUp } from 'lucide-react';
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
    
    // Validate file type - accept both CSV and text files
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv') && 
        file.type !== 'text/plain' && file.type !== 'application/vnd.ms-excel') {
      setFileError('Пожалуйста, выберите файл CSV');
      return;
    }
    
    console.log(`Selected CSV file: ${file.name} (${file.size} bytes, type: ${file.type})`);
    setCsvFile(file);
  };

  const handleImportClick = async () => {
    if (!csvFile) {
      setFileError('Выберите файл CSV для импорта');
      return;
    }
    
    try {
      console.log(`Importing CSV file: ${csvFile.name}`);
      await handleImport(csvFile);
      console.log('CSV import completed successfully');
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
            Импортируйте товары из CSV файла. Формат должен соответствовать экспорту: столбцы разделены точкой с запятой (;).
            Новые категории будут созданы автоматически. Ссылки на изображения сохраняются как есть.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fileError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col gap-4">
            <div className="border border-dashed border-gray-300 rounded-md p-4 text-center">
              <Input
                type="file"
                accept=".csv,.txt"
                id="csv-upload"
                onChange={handleFileChange}
                disabled={isLoading}
                className="hidden"
              />
              <label 
                htmlFor="csv-upload" 
                className="flex flex-col items-center justify-center cursor-pointer py-2"
              >
                <FileUp className="h-6 w-6 mb-2 text-gray-500" />
                <span className="text-sm font-medium">
                  {csvFile ? csvFile.name : 'Выберите CSV файл'}
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  {csvFile ? `${(csvFile.size / 1024).toFixed(2)} кБ` : 'CSV файл с разделителем ";"'}
                </span>
              </label>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
