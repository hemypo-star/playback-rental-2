
import { useEffect, useState } from 'react';
import { resetStoragePermissions, testStorageConnection } from '@/services/storageService';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InitializeStorageProps {
  onComplete?: (success: boolean) => void;
}

export default function InitializeStorage({ onComplete }: InitializeStorageProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize storage when component mounts
  useEffect(() => {
    initializeStorage();
  }, []);

  const initializeStorage = async () => {
    setIsLoading(true);
    setIsError(false);
    setIsSuccess(false);
    
    try {
      console.log("Initializing storage buckets and permissions...");
      
      // First test if buckets are accessible
      const productsTest = await testStorageConnection('products');
      const categoriesTest = await testStorageConnection('categories');
      
      if (productsTest.success && categoriesTest.success) {
        console.log("Storage buckets already configured correctly");
        setIsSuccess(true);
        if (onComplete) onComplete(true);
        setIsLoading(false);
        return;
      }
      
      // If not successful, try to reset permissions
      const result = await resetStoragePermissions();
      
      if (result) {
        console.log("Storage buckets initialized successfully");
        setIsSuccess(true);
        
        // Verify the connections again
        const productsResult = await testStorageConnection('products');
        const categoriesResult = await testStorageConnection('categories');
        
        if (!productsResult.success || !categoriesResult.success) {
          setIsError(true);
          setErrorMessage('Buckets were created but there might be issues with access. Try reinitializing.');
          
          toast({
            title: 'Warning',
            description: 'Storage buckets were created but there might be access issues',
            variant: 'warning'
          });
          
          // Call onComplete with false to indicate problems
          if (onComplete) onComplete(false);
        } else {
          toast({
            title: 'Success',
            description: 'Storage buckets initialized successfully',
          });
          
          // Call onComplete with true to indicate success
          if (onComplete) onComplete(true);
        }
      } else {
        console.error("Failed to initialize storage buckets");
        setIsError(true);
        setErrorMessage('Failed to initialize storage buckets. Please try again or check the console for details.');
        
        toast({
          title: 'Error',
          description: 'Failed to initialize storage buckets',
          variant: 'destructive'
        });
        
        // Call onComplete with false to indicate failure
        if (onComplete) onComplete(false);
      }
    } catch (error) {
      console.error("Error initializing storage:", error);
      setIsError(true);
      setErrorMessage(`Error: ${error.message || 'Unknown error'}`);
      
      toast({
        title: 'Error',
        description: 'An error occurred while initializing storage',
        variant: 'destructive'
      });
      
      // Call onComplete with false to indicate failure
      if (onComplete) onComplete(false);
    } finally {
      setIsLoading(false);
    }
  };

  // If storage is successful and there are no errors, don't show anything
  if (!isLoading && !isError && isSuccess) {
    return null;
  }

  return (
    <Alert className={`mb-4 ${isSuccess && !isError ? 'bg-green-50' : isError ? 'bg-red-50' : 'bg-blue-50'}`}>
      <AlertTitle className="flex items-center gap-2">
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Initializing Storage
          </>
        ) : isError ? (
          <>
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Storage Initialization Failed
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Storage Initialized
          </>
        )}
      </AlertTitle>
      <AlertDescription>
        {isLoading ? (
          'Setting up storage buckets for images...'
        ) : isError ? (
          <>
            <div className="mb-2">{errorMessage}</div>
            <Button 
              size="sm" 
              onClick={initializeStorage} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Trying again...
                </>
              ) : (
                'Try Again'
              )}
            </Button>
          </>
        ) : (
          'Storage buckets are ready for image uploads.'
        )}
      </AlertDescription>
    </Alert>
  );
}
