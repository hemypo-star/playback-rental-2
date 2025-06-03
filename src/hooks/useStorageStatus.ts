
import { useState, useEffect } from 'react';
import { checkStorageStatus } from '@/services/storageService';

export const useStorageStatus = () => {
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);

  const checkStorageConnection = async () => {
    try {
      setIsCheckingStorage(true);
      setStorageError(null);
      
      console.log('Checking storage connection...');
      const status = await checkStorageStatus();
      
      if (status.products && status.categories) {
        console.log('Storage buckets are ready');
        setStorageInitialized(true);
        setStorageError(null);
      } else {
        console.log('Storage buckets not ready:', status.message);
        setStorageInitialized(false);
        setStorageError(status.message || 'Storage buckets not accessible');
      }
    } catch (error: any) {
      console.error('Error checking storage connection:', error);
      setStorageInitialized(false);
      setStorageError(error?.message || 'Failed to check storage connection');
    } finally {
      setIsCheckingStorage(false);
    }
  };

  useEffect(() => {
    checkStorageConnection();
  }, []);

  return {
    storageInitialized,
    storageError,
    isCheckingStorage,
    checkStorageConnection
  };
};
