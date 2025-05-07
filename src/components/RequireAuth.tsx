
import { Navigate, useLocation } from 'react-router-dom';
import { checkAuth } from '@/services/authService';

interface RequireAuthProps {
  children: JSX.Element;
}

const RequireAuth = ({ children }: RequireAuthProps) => {
  const location = useLocation();
  const isAuthenticated = checkAuth();

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;
