
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { resetStoragePermissions, testStorageConnection } from '@/services/storageService';
import { verifyStorageAccess } from '@/utils/imageUtils';

export type StorageStatusType = {
  initialized: boolean;
  error: string | null;
  products: boolean;
  categories: boolean;
};

export default function useStorageStatus() {
  const { toast } = useToast();
  const [storageStatus, setStorageStatus] = useState<StorageStatusType>({
    initialized: false,
    error: null,
    products: false,
    categories: false
  });
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);

  // Initialize storage buckets when the form loads
  useEffect(() => {
    const initStorage = async () => {
      try {
        setIsCheckingStorage(true);
        console.log("Initializing storage buckets...");
        
        // First reset/ensure buckets
        const reset = await resetStoragePermissions();
        console.log("Storage reset result:", reset);
        
        if (!reset) {
          setStorageStatus({
            initialized: false,
            error: "Не удалось инициализировать хранилище для изображений",
            products: false,
            categories: false
          });
          
          toast({
            title: "Предупреждение",
            description: "Не удалось инициализировать хранилище для изображений",
            variant: "destructive"
          });
          return;
        }
        
        // Then verify access
        const access = await verifyStorageAccess();
        
        setStorageStatus({
          initialized: access.products && access.categories,
          error: !access.products || !access.categories ? 
            "Не удалось получить доступ к хранилищу изображений" : null,
          products: access.products,
          categories: access.categories
        });
        
        if (!access.products || !access.categories) {
          toast({
            title: "Предупреждение",
            description: "Проблемы с доступом к хранилищу изображений",
            variant: "warning"
          });
        } else {
          console.log("Storage buckets initialized successfully");
        }
      } catch (error) {
        console.error("Error initializing storage:", error);
        
        setStorageStatus({
          initialized: false,
          error: "Ошибка инициализации хранилища",
          products: false,
          categories: false
        });
        
        toast({
          title: "Ошибка",
          description: "Не удалось инициализировать хранилище",
          variant: "destructive"
        });
      } finally {
        setIsCheckingStorage(false);
      }
    };
    
    initStorage();
  }, [toast]);

  // Test storage connection to diagnose issues
  const checkStorageConnection = async () => {
    try {
      setIsCheckingStorage(true);
      toast({
        title: "Проверка хранилища",
        description: "Выполняется проверка соединения с хранилищем...",
      });
      
      const productsTest = await testStorageConnection('products');
      const categoriesTest = await testStorageConnection('categories');
      
      console.log("Storage connection test results:", { products: productsTest, categories: categoriesTest });
      
      setStorageStatus({
        initialized: productsTest.success && categoriesTest.success,
        error: !productsTest.success || !categoriesTest.success ? 
          `Проблемы с доступом к хранилищу: ${!productsTest.success ? productsTest.message : ''} ${!categoriesTest.success ? categoriesTest.message : ''}` : null,
        products: productsTest.success,
        categories: categoriesTest.success
      });
      
      toast({
        title: productsTest.success && categoriesTest.success ? "Хранилище доступно" : "Проблемы с хранилищем",
        description: productsTest.success && categoriesTest.success ? 
          "Соединение с хранилищем успешно установлено" : 
          "Обнаружены проблемы с хранилищем. Проверьте консоль для деталей.",
        variant: productsTest.success && categoriesTest.success ? "default" : "destructive"
      });
    } catch (error) {
      console.error("Error checking storage connection:", error);
      
      toast({
        title: "Ошибка",
        description: "Не удалось проверить соединение с хранилищем",
        variant: "destructive"
      });
    } finally {
      setIsCheckingStorage(false);
    }
  };

  return {
    storageStatus,
    isCheckingStorage,
    checkStorageConnection
  };
}
