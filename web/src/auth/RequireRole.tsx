import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui/primitives';
import type { Role } from '@/lib/types';
import { homeFor, useAuth } from './AuthProvider';

/**
 * Route guard. This only improves the experience — every API call is authorised again on the server,
 * so removing this component would not expose any data.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) {
    const login = role === 'ADMIN' ? '/admin/login' : '/login';
    return <Navigate to={login} replace state={{ from: location.pathname + location.search }} />;
  }
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <>{children}</>;
}
