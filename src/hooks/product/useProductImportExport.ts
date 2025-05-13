
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
      await exportProductsToCSV();
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
      await importProductsFromCSV(file);
      queryClient.invalidateQueries({ queryKey: ['products'] });
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
