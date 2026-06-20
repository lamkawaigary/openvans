import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import OrderV2Demo from './pages/OrderV2Demo';
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

        {/* 官網根 = 叫車畫面 (renter/admin), owner 跳 driver-jobs, 未登入跳 /login */}
        <Route path="/" element={
          <RouteGuard allowedRoles={['renter', 'admin']} fallback="/driver-jobs">
            <OrderV2Demo />
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

        {/* 正式生產 — 唯一叫車途徑 (OrderV2Demo, 同 / 一樣 auth) */}
        <Route path="/order" element={
          <RouteGuard allowedRoles={['renter', 'admin']} fallback="/driver-jobs">
            <OrderV2Demo />
          </RouteGuard>
        } />
        {/* 舊 /order-v2 自動 redirect 去 /order (向後兼容, 之後可以拎走) */}
        <Route path="/order-v2" element={<Navigate to="/order" replace />} />

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