
import { useState, useEffect } from 'react';

export const useStorageStatus = () => {
  const [storageInitialized, setStorageInitialized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(true);

  const checkStorageConnection = async () => {
    try {
      setIsCheckingStorage(true);
      setStorageError(null);
      
      console.log('Checking storage connection...');
      // Call API route instead of direct service
      const resp = await fetch('/api/storage/status');
      if (!resp.ok) {
        throw new Error('Storage API is not reachable');
      }
      const status = await resp.json();
      
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

  const handleStorageInitialized = (success: boolean) => {
    setStorageInitialized(success);
    if (!success) {
      setStorageError('Storage initialization failed');
    } else {
      setStorageError(null);
    }
  };

  useEffect(() => {
    checkStorageConnection();
    // eslint-disable-next-line
  }, []);

  return {
    storageInitialized,
    storageError,
    isCheckingStorage,
    checkStorageConnection,
    handleStorageInitialized
  };
};
