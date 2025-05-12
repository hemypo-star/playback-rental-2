
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export type StorageStatusType = {
  initialized: boolean | null;
  error: string | null;
};

export const useStorageStatus = () => {
  const { toast } = useToast();
  const [storageInitialized, setStorageInitialized] = useState<boolean | null>(null);

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

  return {
    storageInitialized,
    handleStorageInitialized
  };
};
