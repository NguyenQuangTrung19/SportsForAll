import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute, OnboardingGate, ProtectedRoute } from '@/components/ProtectedRoute';
import { queryClient } from '@/lib/query-client';
import { AdminLandingPage } from '@/pages/AdminLandingPage';
import { AdminLogsPage } from '@/pages/AdminLogsPage';
import { AdminOverviewPage } from '@/pages/AdminOverviewPage';
import { AdminPostsPage } from '@/pages/AdminPostsPage';
import { AdminReportsPage } from '@/pages/AdminReportsPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { AdminVenuesPage } from '@/pages/AdminVenuesPage';
import { FindOpponentsPage } from '@/pages/FindOpponentsPage';
import { FindTeammatesPage } from '@/pages/FindTeammatesPage';
import { HomePage } from '@/pages/HomePage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { LookingForTeamPage } from '@/pages/LookingForTeamPage';
import { MatchRequestCreatePage } from '@/pages/MatchRequestCreatePage';
import { MatchRequestDetailPage } from '@/pages/MatchRequestDetailPage';
import { MyBookingsPage } from '@/pages/MyBookingsPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { PostCreatePage } from '@/pages/PostCreatePage';
import { PostDetailPage } from '@/pages/PostDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TeamCreatePage } from '@/pages/TeamCreatePage';
import { TeamDetailPage } from '@/pages/TeamDetailPage';
import { TeamsPage } from '@/pages/TeamsPage';
import { VenueCreatePage } from '@/pages/VenueCreatePage';
import { VenueDetailPage } from '@/pages/VenueDetailPage';
import { VenueManagePage } from '@/pages/VenueManagePage';
import { VenuesPage } from '@/pages/VenuesPage';
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
              path="/admin"
              element={
                <AdminRoute>
                  <AdminOverviewPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/posts"
              element={
                <AdminRoute>
                  <AdminPostsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <AdminRoute>
                  <AdminReportsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/venues"
              element={
                <AdminRoute>
                  <AdminVenuesPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/logs"
              element={
                <AdminRoute>
                  <AdminLogsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/landing"
              element={
                <AdminRoute>
                  <AdminLandingPage />
                </AdminRoute>
              }
            />
            <Route
              path="/looking-for-team"
              element={
                <ProtectedRoute>
                  <LookingForTeamPage />
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
            <Route
              path="/teams/:id/posts/new"
              element={
                <ProtectedRoute>
                  <PostCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/find-teammates"
              element={
                <ProtectedRoute>
                  <FindTeammatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/posts/:id"
              element={
                <ProtectedRoute>
                  <PostDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams/:id/match-requests/new"
              element={
                <ProtectedRoute>
                  <MatchRequestCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/find-opponents"
              element={
                <ProtectedRoute>
                  <FindOpponentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venues"
              element={
                <ProtectedRoute>
                  <VenuesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venues/new"
              element={
                <ProtectedRoute>
                  <VenueCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venues/:id"
              element={
                <ProtectedRoute>
                  <VenueDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/venues/:id/manage"
              element={
                <ProtectedRoute>
                  <VenueManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match-requests/:id"
              element={
                <ProtectedRoute>
                  <MatchRequestDetailPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeBridge>
    </QueryClientProvider>
  );
}
