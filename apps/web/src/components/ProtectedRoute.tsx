import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!user.onboardedAt) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (user.onboardedAt) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
