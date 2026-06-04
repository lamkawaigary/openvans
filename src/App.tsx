import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadScriptNext } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from './firebase/config';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { SideMenuProvider } from './context/SideMenuContext';
import SideMenu from './components/SideMenu';
import { useSideMenu } from './context/SideMenuContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import PublishPage from './pages/PublishPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import ProfilePage from './pages/ProfilePage';
import VanDashboard from './pages/VanDashboard';
import MyVansPage from './pages/MyVansPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';

function AppShell() {
  const { isOpen, closeMenu } = useSideMenu();

  return (
    <>
      <SideMenu open={isOpen} onClose={closeMenu} />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:id" element={<TripDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/dashboard" element={<VanDashboard />} />
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/my-vans" element={<MyVansPage />} />
        <Route path="*" element={<HomePage />} />
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
