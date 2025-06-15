
import { useEffect, useState } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';

type InitializeStorageProps = {
  onComplete: (success: boolean) => void;
};

async function apiResetStoragePermissions() {
  const resp = await fetch('/api/storage/reset-permissions', {
    method: 'POST'
  });
  if (!resp.ok) {
    throw new Error('Failed to reset storage permissions');
  }
  const data = await resp.json();
  return data.success;
}

async function apiTestStorageConnection(bucket: string) {
  const resp = await fetch('/api/storage/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucket })
  });
  if (!resp.ok) {
    throw new Error(`Failed to test storage connection for bucket "${bucket}"`);
  }
  return resp.json();
}

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
    // eslint-disable-next-line
  }, []);

  const initializeStorage = async () => {
    try {
      setStatus(prev => ({ ...prev, initializing: true, error: null }));

      console.log("Initializing storage (frontend calls backend API now)...");

      // Step 1: Reset storage permissions using API route
      const resetResult = await apiResetStoragePermissions();

      if (!resetResult) {
        throw new Error("Failed to initialize storage. Please try again.");
      }

      // Step 2: Test connection with API route
      const productsTest = await apiTestStorageConnection('products');
      const categoriesTest = await apiTestStorageConnection('categories');

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
    } catch (error: any) {
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

  return null;
}
