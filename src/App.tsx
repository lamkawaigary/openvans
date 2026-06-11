import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadScriptNext } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from './firebase/config';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SideMenuProvider } from './context/SideMenuContext';
import SideMenu from './components/SideMenu';
import { useSideMenu } from './context/SideMenuContext';
import RouteGuard from './components/RouteGuard';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import PublishPage from './pages/PublishPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import ProfilePage from './pages/ProfilePage';
import VanDashboard from './pages/VanDashboard';
import DriverJobsPage from './pages/DriverJobsPage';
import MyVansPage from './pages/MyVansPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';

function AppShell() {
  const { isOpen, closeMenu } = useSideMenu();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: '#F5F7FA' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🚛</div>
          <div style={{ fontSize: 14, color: '#6B7280' }}>載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SideMenu open={isOpen} onClose={closeMenu} />
      <Routes>
        {/* Login — guest only (redirect logged-in users) */}
        <Route path="/login" element={
          <RouteGuard allowedRoles={undefined} fallback="/">
            <LoginPage />
          </RouteGuard>
        } />

        {/* Home — renter/admin see map, owner redirected to driver-jobs in HomePage */}
        <Route path="/" element={
          <RouteGuard allowedRoles={['renter', 'admin']} fallback="/driver-jobs">
            <HomePage />
          </RouteGuard>
        } />

        {/* Publish — renter/admin only */}
        <Route path="/publish" element={
          <RouteGuard allowedRoles={['renter', 'admin']} fallback="/">
            <PublishPage />
          </RouteGuard>
        } />

        {/* Trips — any authenticated user */}
        <Route path="/trips" element={
          <RouteGuard>
            <TripsPage />
          </RouteGuard>
        } />
        <Route path="/trips/:id" element={
          <RouteGuard>
            <TripDetailPage />
          </RouteGuard>
        } />

        {/* Profile — any authenticated user */}
        <Route path="/profile" element={
          <RouteGuard>
            <ProfilePage />
          </RouteGuard>
        } />

        {/* Onboarding — any authenticated user */}
        <Route path="/onboarding" element={
          <RouteGuard>
            <OnboardingPage />
          </RouteGuard>
        } />

        {/* Owner/Admin only */}
        <Route path="/dashboard" element={
          <RouteGuard allowedRoles={['owner', 'admin']} fallback="/">
            <VanDashboard />
          </RouteGuard>
        } />
        <Route path="/driver-jobs" element={
          <RouteGuard allowedRoles={['owner', 'admin']} fallback="/">
            <DriverJobsPage />
          </RouteGuard>
        } />
        <Route path="/my-vans" element={
          <RouteGuard allowedRoles={['owner', 'admin']} fallback="/">
            <MyVansPage />
          </RouteGuard>
        } />

        {/* Admin only */}
        <Route path="/admin" element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        } />

        {/* Catch-all — owner → driver-jobs, others → home */}
        <Route path="*" element={
          user?.role === 'owner' ? <DriverJobsPage /> : <HomePage />
        } />
      </Routes>
    </>
  );
}

export default function WrappedApp() {
  return (
    <LoadScriptNext
      googleMapsApiKey={GOOGLE_MAPS_API_KEY}
      libraries={['places']}
      language="zh-TW"
      onLoad={() => console.log('Google Maps script loaded!')}
      onError={(e) => console.error('Google Maps load error:', e)}
    >
      <BrowserRouter>
        <AuthProvider>
          <NotificationProvider>
            <SideMenuProvider>
              <AppShell />
            </SideMenuProvider>
          </NotificationProvider>
        </AuthProvider>
      </BrowserRouter>
    </LoadScriptNext>
  );
}