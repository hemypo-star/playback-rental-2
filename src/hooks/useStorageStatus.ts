
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { testStorageConnection, resetStoragePermissions } from '@/services/storageService';
import { verifyStorageAccess } from '@/utils/imageUtils';

export type StorageStatusType = {
  initialized: boolean | null;
  error: string | null;
};

export const useStorageStatus = () => {
  const { toast } = useToast();
  const [storageInitialized, setStorageInitialized] = useState<boolean | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);

  // Handler for storage initialization status
  const handleStorageInitialized = (success: boolean) => {
    setStorageInitialized(success);
    
    if (!success) {
      toast({
        title: "Storage initialization failed",
        description: "There might be issues with uploading or displaying images.",
        variant: "destructive"
      });
    }
  };

  // Function to check storage connection
  const checkStorageConnection = async () => {
    try {
      setIsCheckingStorage(true);
      toast({
        title: "Checking storage",
        description: "Verifying storage connection...",
      });
      
      const productsTest = await testStorageConnection('products');
      const categoriesTest = await testStorageConnection('categories');
      
      console.log("Storage connection test results:", { 
        products: productsTest, 
        categories: categoriesTest 
      });
      
      const isInitialized = productsTest.success && categoriesTest.success;
      setStorageInitialized(isInitialized);
      
      if (!isInitialized) {
        const errorMessage = `Storage issues: ${!productsTest.success ? productsTest.message : ''} ${!categoriesTest.success ? categoriesTest.message : ''}`.trim();
        setStorageError(errorMessage);
        
        toast({
          title: "Storage issues",
          description: "There are problems with storage access. Check console for details.",
          variant: "destructive"
        });
      } else {
        setStorageError(null);
        
        toast({
          title: "Storage available",
          description: "Storage connection verified successfully",
        });
      }
    } catch (error) {
      console.error("Error checking storage:", error);
      setStorageInitialized(false);
      setStorageError("Failed to check storage connection");
      
      toast({
        title: "Error",
        description: "Failed to verify storage connection",
        variant: "destructive"
      });
    } finally {
      setIsCheckingStorage(false);
    }
  };

  return {
    storageInitialized,
    storageError,
    isCheckingStorage,
    handleStorageInitialized,
    checkStorageConnection
  };
};
