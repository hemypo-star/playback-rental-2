
import { Navigate, useLocation } from 'react-router-dom';
import { checkAuth } from '@/services/authService';
import { useEffect, useState } from 'react';
import { AlertVariant, AlertTitle, AlertDescription } from '@/components/ui/alert-variant';

interface RequireAuthProps {
  children: JSX.Element;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const authenticated = await checkAuth();
        setIsAuthenticated(authenticated);
      } catch (error) {
        console.error('Authentication check failed:', error);
        setAuthError('Authentication check failed. Please try logging in again.');
        setIsAuthenticated(false);
      }
    };

    verifyAuth();
  }, []);

  if (isAuthenticated === null) {
    // Still checking authentication
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertVariant variant="warning" className="max-w-md">
          <AlertTitle>Ошибка аутентификации</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </AlertVariant>
        <button 
          className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          onClick={() => window.location.href = '/login'}
        >
          Перейти на страницу входа
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;
