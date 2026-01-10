import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { hasBusinessUnitAccess, hasRouteAccess, isDefaultAdmin, getCurrentUser } from '../utils/access-control-helper';
import { logNavigation } from '../utils/activity-logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredBusiness?: string;
  requiredPath?: string; // Optional: specific path to check access
}

const ProtectedRoute = ({ children, requiredBusiness, requiredPath }: ProtectedRouteProps) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setRedirectTo('/login');
        setIsChecking(false);
        return;
      }

      // Default admin has full access
      if (isDefaultAdmin(currentUser)) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      if (requiredBusiness) {
        const selectedBusiness = localStorage.getItem('selectedBusiness');
        
        // Jika belum pilih business, redirect ke business selector
        if (!selectedBusiness) {
          setRedirectTo('/');
          setIsChecking(false);
          return;
        }
        
        // Jika ada requiredBusiness dan tidak match, redirect ke business selector
        if (selectedBusiness !== requiredBusiness) {
          setRedirectTo('/');
          setIsChecking(false);
          return;
        }

        // Check business unit access
        const hasBusinessAccess = await hasBusinessUnitAccess(requiredBusiness, currentUser.id);
        if (!hasBusinessAccess) {
          setRedirectTo('/');
          setIsChecking(false);
          return;
        }

        // Check route access if requiredPath is provided or if we're in a nested route
        const pathToCheck = requiredPath || location.pathname;
        if (pathToCheck && pathToCheck !== '/') {
          const hasPathAccess = await hasRouteAccess(pathToCheck, requiredBusiness, currentUser.id);
          if (!hasPathAccess) {
            // User doesn't have access to this route, redirect to business selector
            // The Layout component will handle redirecting to first accessible route
            setRedirectTo('/');
            setIsChecking(false);
            return;
          }
        }
      }

      setHasAccess(true);
      setIsChecking(false);
      
      // Log navigation after access is confirmed
      const pathToLog = requiredPath || location.pathname;
      if (pathToLog && pathToLog !== '/') {
        logNavigation(pathToLog).catch(() => {
          // Silent fail for logging
        });
      }
    };

    checkAccess();
  }, [requiredBusiness, requiredPath, location.pathname]);

  if (isChecking) {
    // Show loading state while checking access
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '14px',
        color: 'var(--text-secondary)'
      }}>
        Memeriksa akses...
      </div>
    );
  }

  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;

