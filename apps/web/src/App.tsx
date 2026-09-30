import { QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AdminRoute, OnboardingGate, ProtectedRoute } from '@/components/ProtectedRoute';
import { queryClient } from '@/lib/query-client';
import { applySportTheme, useSportStore } from '@/stores/sport-store';

/**
 * Mỗi trang là một chunk riêng, tải khi người dùng vào đúng đường dẫn đó.
 *
 * Trước đây 28 trang gộp một tệp 614 KB, trong đó bảy trang quản trị và bốn
 * trang sân bãi chỉ một phần nhỏ người dùng mở tới. Không có ngoại lệ nào ở đây,
 * kể cả trang giới thiệu: một quy tắc cho mọi tuyến dễ giữ hơn một danh sách
 * ngoại lệ mà sáu tháng nữa không ai nhớ tiêu chí.
 *
 * Các trang chỉ export named component nên phải map sang `default` cho `lazy()`.
 */
const AdminLandingPage = lazy(() =>
  import('@/pages/AdminLandingPage').then((m) => ({ default: m.AdminLandingPage })),
);
const AdminLogsPage = lazy(() =>
  import('@/pages/AdminLogsPage').then((m) => ({ default: m.AdminLogsPage })),
);
const AdminOverviewPage = lazy(() =>
  import('@/pages/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage })),
);
const AdminPostsPage = lazy(() =>
  import('@/pages/AdminPostsPage').then((m) => ({ default: m.AdminPostsPage })),
);
const AdminReportsPage = lazy(() =>
  import('@/pages/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })),
);
const AdminUsersPage = lazy(() =>
  import('@/pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
);
const AdminVenuesPage = lazy(() =>
  import('@/pages/AdminVenuesPage').then((m) => ({ default: m.AdminVenuesPage })),
);
const FindOpponentsPage = lazy(() =>
  import('@/pages/FindOpponentsPage').then((m) => ({ default: m.FindOpponentsPage })),
);
const FindTeammatesPage = lazy(() =>
  import('@/pages/FindTeammatesPage').then((m) => ({ default: m.FindTeammatesPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const OAuthCallbackPage = lazy(() =>
  import('@/pages/OAuthCallbackPage').then((m) => ({ default: m.OAuthCallbackPage })),
);
const PhoneLoginPage = lazy(() =>
  import('@/pages/PhoneLoginPage').then((m) => ({ default: m.PhoneLoginPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const VerifyEmailPage = lazy(() =>
  import('@/pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })),
);
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })));
const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LookingForTeamPage = lazy(() =>
  import('@/pages/LookingForTeamPage').then((m) => ({ default: m.LookingForTeamPage })),
);
const MatchRequestCreatePage = lazy(() =>
  import('@/pages/MatchRequestCreatePage').then((m) => ({ default: m.MatchRequestCreatePage })),
);
const MatchRequestDetailPage = lazy(() =>
  import('@/pages/MatchRequestDetailPage').then((m) => ({ default: m.MatchRequestDetailPage })),
);
const MyBookingsPage = lazy(() =>
  import('@/pages/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })),
);
const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const PostCreatePage = lazy(() =>
  import('@/pages/PostCreatePage').then((m) => ({ default: m.PostCreatePage })),
);
const PostDetailPage = lazy(() =>
  import('@/pages/PostDetailPage').then((m) => ({ default: m.PostDetailPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const TeamCreatePage = lazy(() =>
  import('@/pages/TeamCreatePage').then((m) => ({ default: m.TeamCreatePage })),
);
const TeamDetailPage = lazy(() =>
  import('@/pages/TeamDetailPage').then((m) => ({ default: m.TeamDetailPage })),
);
const TeamsPage = lazy(() => import('@/pages/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const VenueCreatePage = lazy(() =>
  import('@/pages/VenueCreatePage').then((m) => ({ default: m.VenueCreatePage })),
);
const VenueDetailPage = lazy(() =>
  import('@/pages/VenueDetailPage').then((m) => ({ default: m.VenueDetailPage })),
);
const VenueManagePage = lazy(() =>
  import('@/pages/VenueManagePage').then((m) => ({ default: m.VenueManagePage })),
);
const VenuesPage = lazy(() =>
  import('@/pages/VenuesPage').then((m) => ({ default: m.VenuesPage })),
);

/**
 * Khoảng trống trong lúc chunk của trang đang bay về. Cố ý không có spinner:
 * chunk trang nặng vài chục KB nên khung này thường chớp qua trong một khung
 * hình — một spinner nhấp nháy còn khó chịu hơn không có gì.
 */
function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <p className="text-sm text-ink-soft">Đang tải...</p>
    </div>
  );
}

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
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/phone-login" element={<PhoneLoginPage />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
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
          </Suspense>
        </BrowserRouter>
      </ThemeBridge>
    </QueryClientProvider>
  );
}
