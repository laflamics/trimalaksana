import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredBusiness?: string;
}

const ProtectedRoute = ({ children, requiredBusiness }: ProtectedRouteProps) => {
  const currentUser = localStorage.getItem('currentUser');
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredBusiness) {
    const selectedBusiness = localStorage.getItem('selectedBusiness');
    
    // Jika belum pilih business, redirect ke business selector
    if (!selectedBusiness) {
      return <Navigate to="/" replace />;
    }
    
    // Jika ada requiredBusiness dan tidak match, redirect ke business selector
    if (selectedBusiness !== requiredBusiness) {
      return <Navigate to="/" replace />;
    }
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;

