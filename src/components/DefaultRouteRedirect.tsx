import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getFirstAccessibleRoute, getCurrentUser, isDefaultAdmin } from '../utils/access-control-helper';

interface DefaultRouteRedirectProps {
  businessUnit: string;
  defaultRoute: string;
}

const DefaultRouteRedirect = ({ businessUnit, defaultRoute }: DefaultRouteRedirectProps) => {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setRedirectTo('/login');
        setIsChecking(false);
        return;
      }

      // Default admin can access default route
      // Convert relative path to full path
      if (isDefaultAdmin(currentUser)) {
        const fullRoute = defaultRoute.startsWith('/') 
          ? defaultRoute 
          : `/${businessUnit}/${defaultRoute}`;
        setRedirectTo(fullRoute);
        setIsChecking(false);
        return;
      }

      // Get first accessible route
      const firstAccessible = await getFirstAccessibleRoute(
        businessUnit,
        defaultRoute,
        currentUser.id
      );

      setRedirectTo(firstAccessible);
      setIsChecking(false);
    };

    checkAndRedirect();
  }, [businessUnit, defaultRoute]);

  if (isChecking) {
    return null; // Layout will handle showing loading or redirect
  }

  if (!redirectTo) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={redirectTo} replace />;
};

export default DefaultRouteRedirect;
