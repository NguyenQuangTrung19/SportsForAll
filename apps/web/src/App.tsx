import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { OnboardingGate, ProtectedRoute } from '@/components/ProtectedRoute';
import { queryClient } from '@/lib/query-client';
import { HomePage } from '@/pages/HomePage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TeamCreatePage } from '@/pages/TeamCreatePage';
import { TeamDetailPage } from '@/pages/TeamDetailPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { applySportTheme, useSportStore } from '@/stores/sport-store';

function ThemeBridge({ children }: { children: React.ReactNode }) {
  const sport = useSportStore((s) => s.current);
  useEffect(() => {
    applySportTheme(sport);
  }, [sport]);
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeBridge>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/onboarding"
              element={
                <OnboardingGate>
                  <OnboardingPage />
                </OnboardingGate>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <TeamsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/new"
              element={
                <ProtectedRoute>
                  <TeamCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/:id"
              element={
                <ProtectedRoute>
                  <TeamDetailPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeBridge>
    </QueryClientProvider>
  );
}
