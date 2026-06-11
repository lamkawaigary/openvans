import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
  /** Roles allowed to access this route. Undefined = any role including guest */
  allowedRoles?: ('owner' | 'renter' | 'admin')[];
  /** Routes to redirect to when access is denied */
  fallback?: string;
}

/**
 * Protects routes based on user role.
 * - No allowedRoles = any authenticated user can access
 * - With allowedRoles = only those roles can access
 * - Redirects to fallback (default: '/') when access denied
 */
export default function RouteGuard({ children, allowedRoles, fallback = '/' }: RouteGuardProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    // Guest route (allowedRoles=undefined): allow guests through
    if (allowedRoles === undefined) return;
    if (!user) {
      navigate('/login');
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      navigate(fallback);
    }
  }, [user, loading]);

  if (loading) return null;
  return <>{children}</>;
}