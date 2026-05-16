import { lazy, Suspense, Component } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/components/auth/LoginPage';
import TermsModal from '@/components/auth/TermsModal';
import OnboardingForm from '@/components/auth/OnboardingForm';
import MobileShell from '@/components/layout/MobileShell';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import { ToastProvider } from '@/context/ToastContext';

const HomePage                = lazy(() => import('@/pages/HomePage'));
const OrdersPage              = lazy(() => import('@/pages/OrdersPage'));
const WalletPage              = lazy(() => import('@/pages/WalletPage'));
const ProfilePage             = lazy(() => import('@/pages/ProfilePage'));
const CreateDeliveryPage      = lazy(() => import('@/pages/CreateDeliveryPage'));
const PaymentPage             = lazy(() => import('@/pages/PaymentPage'));
const TrackingPage            = lazy(() => import('@/pages/TrackingPage'));
const CourierDashboard        = lazy(() => import('@/pages/CourierDashboard'));
const CourierEarningsPage     = lazy(() => import('@/pages/CourierEarningsPage'));
const CampusMapPage           = lazy(() => import('@/pages/CampusMapPage'));
const ReferralPage            = lazy(() => import('@/pages/ReferralPage'));

class ErrorBoundary extends Component {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-6 text-center max-w-sm">
          <p className="text-red-400 font-bold text-lg mb-2">Something went wrong</p>
          <p className="text-gray-400 text-sm mb-4">The app ran into an error. Tap Reload to continue.</p>
          <button onClick={() => window.location.reload()} className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">Reload</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

function Spinner() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-800 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-800 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const { session, profile, loading, authError } = useAuth();
  const location = useLocation();

  if (location.pathname === '/privacy') return <PrivacyPolicyPage />;

  if (loading) return <LoadingScreen />;
  if (authError) return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-6 text-center max-w-sm">
        <p className="text-red-400 font-bold text-lg mb-2">Connection Error</p>
        <p className="text-gray-400 text-sm mb-4">Could not reach the server. Check your internet and try again.</p>
        <button onClick={() => window.location.reload()} className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm">
          Retry
        </button>
      </div>
    </div>
  );
  if (!session) return <LoginPage />;
  if (!profile?.terms_accepted) return <TermsModal />;
  if (!profile?.onboarding_complete) return <OnboardingForm />;
  if (profile?.is_blacklisted) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-6 text-center max-w-sm">
          <p className="text-red-400 font-bold text-lg mb-2">Account Suspended</p>
          <p className="text-gray-500 text-sm">{profile.blacklist_reason || 'Your account has been suspended. Contact support.'}</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <MobileShell>
        <ErrorBoundary>
        <Suspense fallback={<Spinner />}>
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
            <Route path="/courier/map" element={<CampusMapPage />} />
            <Route path="/courier/earnings" element={<CourierEarningsPage />} />

            {/* Referral */}
            <Route path="/referral" element={<ReferralPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </MobileShell>
    </ToastProvider>
  );
}
