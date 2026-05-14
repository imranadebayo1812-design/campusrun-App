import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/components/auth/LoginPage';
import TermsModal from '@/components/auth/TermsModal';
import OnboardingForm from '@/components/auth/OnboardingForm';
import MobileShell from '@/components/layout/MobileShell';
import HomePage from '@/pages/HomePage';
import OrdersPage from '@/pages/OrdersPage';
import WalletPage from '@/pages/WalletPage';
import ProfilePage from '@/pages/ProfilePage';
import CreateDeliveryPage from '@/pages/CreateDeliveryPage';
import PaymentPage from '@/pages/PaymentPage';
import TrackingPage from '@/pages/TrackingPage';
import CourierDashboard from '@/pages/CourierDashboard';
import CourierNotificationsPage from '@/pages/CourierNotificationsPage';
import CourierEarningsPage from '@/pages/CourierEarningsPage';
import AdminPortal from '@/pages/AdminPortal';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-brand-500 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { session, profile, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!session) return <LoginPage />;
  if (!profile?.terms_accepted) return <TermsModal />;
  if (!profile?.onboarding_complete) return <OnboardingForm />;
  if (profile?.is_blacklisted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 text-center max-w-sm shadow">
          <p className="text-red-600 font-bold text-lg mb-2">Account Suspended</p>
          <p className="text-gray-500 text-sm">{profile.blacklist_reason || 'Your account has been suspended. Contact support.'}</p>
        </div>
      </div>
    );
  }

  return (
    <MobileShell>
      <Routes>
        {/* Buyer */}
        <Route path="/" element={<HomePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/create-order" element={<CreateDeliveryPage />} />
        <Route path="/payment/:deliveryId" element={<PaymentPage />} />
        <Route path="/track/:deliveryId" element={<TrackingPage />} />

        {/* Courier */}
        <Route path="/courier" element={<CourierDashboard />} />
        <Route path="/courier/notifications" element={<CourierNotificationsPage />} />
        <Route path="/courier/earnings" element={<CourierEarningsPage />} />

        {/* Admin */}
        {profile?.is_admin && <Route path="/admin/*" element={<AdminPortal />} />}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MobileShell>
  );
}
