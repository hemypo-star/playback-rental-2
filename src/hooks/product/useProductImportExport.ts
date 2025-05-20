
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  exportProductsToCSV,
  importProductsFromCSV
} from "@/services/productService";

export const useProductImportExport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const csvContent = await exportProductsToCSV();
      
      // Set proper encoding for Russian characters
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Экспорт завершен",
        description: "Продукты успешно экспортированы в CSV",
      });
    } catch (error) {
      toast({
        title: "Ошибка экспорта",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      setIsLoading(true);
      
      // Read the file content as text with encoding detection
      const fileContent = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      });
      
      // Now pass the string content to importProductsFromCSV
      await importProductsFromCSV(fileContent);
      
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      toast({
        title: "Импорт завершен",
        description: "Продукты успешно импортированы из CSV",
      });
    } catch (error) {
      toast({
        title: "Ошибка импорта",
        description: error instanceof Error ? error.message : "Неизвестная ошибка",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handleExport,
    handleImport
  };
};
