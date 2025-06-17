
import { useEffect, useState } from 'react';
import { resetStoragePermissions, testStorageConnection } from '@/services/storageService'; 
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';

type InitializeStorageProps = {
  onComplete: (success: boolean) => void;
};

export default function InitializeStorage({ onComplete }: InitializeStorageProps) {
  const [status, setStatus] = useState<{
    initializing: boolean;
    success: boolean | null;
    error: string | null;
    details: {
      products: boolean;
      categories: boolean;
    };
  }>({
    initializing: true,
    success: null,
    error: null,
    details: {
      products: false,
      categories: false
    }
  });

  useEffect(() => {
    initializeStorage();
  }, []);

  const initializeStorage = async () => {
    try {
      setStatus(prev => ({ ...prev, initializing: true, error: null }));

      console.log("Initializing storage...");
      
      // Reset storage permissions to ensure buckets exist and are public
      const resetResult = await resetStoragePermissions();
      
      if (!resetResult) {
        throw new Error("Failed to initialize storage. Please try again.");
      }
      
      // Test connection to confirm everything is working
      const productsTest = await testStorageConnection('products');
      const categoriesTest = await testStorageConnection('categories');
      
      console.log("Storage initialization results:", {
        products: productsTest,
        categories: categoriesTest
      });
      
      const allSuccess = productsTest.success && categoriesTest.success;
      
      setStatus({
        initializing: false,
        success: allSuccess,
        error: allSuccess ? null : "Some storage buckets could not be initialized.",
        details: {
          products: productsTest.success,
          categories: categoriesTest.success
        }
      });
      
      onComplete(allSuccess);
    } catch (error) {
      console.error("Error initializing storage:", error);
      
      setStatus({
        initializing: false,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error initializing storage",
        details: {
          products: false,
          categories: false
        }
      });
      
      onComplete(false);
    }
  };

  // If initialization is still in progress, show loading indicator
  if (status.initializing) {
    return (
      <Alert variant="default" className="bg-muted/50">
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
          <AlertTitle>Initializing storage</AlertTitle>
        </div>
        <AlertDescription>
          Setting up storage buckets for images...
        </AlertDescription>
      </Alert>
    );
  }

  // If initialization failed, show error with retry button
  if (status.success === false) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Storage initialization failed</AlertTitle>
        <AlertDescription>
          <p className="mb-2">{status.error || "Unable to initialize storage for images."}</p>
          <div className="mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={initializeStorage}
              className="bg-white hover:bg-white/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
          <div className="mt-2 text-xs">
            <p>Status: 
              Products: {status.details.products ? "Available" : "Unavailable"}, 
              Categories: {status.details.categories ? "Available" : "Unavailable"}
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // If initialization succeeded, show success message briefly, then nothing
  if (status.success === true) {
    return (
      <Alert variant="default" className="bg-green-50 border-green-200">
        <div className="flex items-center text-green-600">
          <CheckCircle2 className="h-4 w-4 mr-2" />
          <AlertTitle>Storage initialized</AlertTitle>
        </div>
        <AlertDescription className="text-green-700">
          Image storage is ready to use.
        </AlertDescription>
      </Alert>
    );
  }

  return null; // Default return nothing
}
