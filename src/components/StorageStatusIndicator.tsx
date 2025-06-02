
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { checkStorageAccessibility } from '@/utils/optimizedImageUtils';

export const StorageStatusIndicator = () => {
  const [storageStatus, setStorageStatus] = useState<'checking' | 'accessible' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const checkStorage = async () => {
      try {
        const isAccessible = await checkStorageAccessibility();
        if (isAccessible) {
          setStorageStatus('accessible');
        } else {
          setStorageStatus('error');
          setErrorMessage('Storage bucket is not accessible');
        }
      } catch (error) {
        setStorageStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Unknown storage error');
      }
    };

    checkStorage();
  }, []);

  if (storageStatus === 'checking') {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Проверяем доступность хранилища изображений...
        </AlertDescription>
      </Alert>
    );
  }

  if (storageStatus === 'accessible') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Хранилище изображений доступно
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-red-200 bg-red-50">
      <XCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        Проблема с хранилищем изображений: {errorMessage}
      </AlertDescription>
    </Alert>
  );
};
