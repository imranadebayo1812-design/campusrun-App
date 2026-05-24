import { lazy, Suspense, Component } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoginPage from '@/components/auth/LoginPage';
import OnboardingForm from '@/components/auth/OnboardingForm';
import ProfileUpdateRequired from '@/components/auth/ProfileUpdateRequired';
import MobileShell from '@/components/layout/MobileShell';
import PrivacyPolicyPage from '@/pages/PrivacyPolicyPage';
import WelcomePage from '@/pages/WelcomePage';
import AuthConfirmPage from '@/pages/AuthConfirmPage';
import { ToastProvider } from '@/context/ToastContext';

export default function App() {
  const { session, profile, loading, authError } = useAuth();
  const location = useLocation();

  // confirm subdomain — always show the confirmation page
  if (window.location.hostname === 'confirm.campusrun.online') return <AuthConfirmPage />;

  // Public routes — no auth required, always render directly
  if (location.pathname === '/privacy') return <PrivacyPolicyPage />;
  if (location.pathname === '/auth/confirm') return <AuthConfirmPage />;

  // /welcome: only keep if still loading OR user just finished onboarding (has nav state)
  // If fully authenticated + onboarded with no onboarding state, redirect home
  if (location.pathname === '/welcome') {
    const fromOnboarding = !!location.state?.name;
    if (!loading && session && profile?.onboarding_complete && !fromOnboarding) {
      return <Navigate to="/" replace />;
    }
    return <WelcomePage />;
  }

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
  // Profile still loading after login — prevent flash
  if (!profile) return <LoadingScreen />;

  // Admin portal bypasses all onboarding / profile-completeness gates
  if (location.pathname.startsWith('/admin')) {
    if (!profile?.is_admin) return <Navigate to="/" replace />;
    return (
      <ToastProvider>
        <ErrorBoundary>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="deliveries" element={<AdminDeliveries />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="couriers" element={<AdminCouriers />} />
                <Route path="menu" element={<AdminMenuCategories />} />
                <Route path="withdrawals" element={<AdminWithdrawals />} />
                <Route path="disputes" element={<AdminDisputes />} />
                <Route path="price-edits" element={<AdminPriceEdits />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="reports" element={<AdminReports />} />
                <Route path="deletions" element={<AdminDeletions />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    );
  }

  // Regular users — enforce profile completeness before showing the app
  if (!profile.onboarding_complete) return <OnboardingForm />;
  if (!profile.gender) return <ProfileUpdateRequired />;
  if (profile?.is_blacklisted) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-6 text-center max-w-sm">
          <p className="text-red-400 font-bold text-lg mb-2">Account Suspended</p>
          <p className="text-gray-500 text-sm mb-4">{profile.blacklist_reason || 'Your account has been suspended.'}</p>
          <p className="text-gray-600 text-xs mb-1">To appeal this decision, contact us at:</p>
          <a
            href="mailto:support@campusrun.online"
            className="text-brand-400 text-sm font-medium hover:underline"
          >
            support@campusrun.online
          </a>
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
            {/* Post-onboarding welcome — no bottom nav interaction needed */}
            <Route path="/welcome" element={<WelcomePage />} />

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
const AdminLayout             = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminOverview           = lazy(() => import('@/pages/admin/AdminOverview'));
const AdminDeliveries         = lazy(() => import('@/pages/admin/AdminDeliveries'));
const AdminUsers              = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminCouriers           = lazy(() => import('@/pages/admin/AdminCouriers'));
const AdminWithdrawals        = lazy(() => import('@/pages/admin/AdminWithdrawals'));
const AdminMenuCategories     = lazy(() => import('@/pages/admin/AdminMenuCategories'));
const AdminNotifications      = lazy(() => import('@/pages/admin/AdminNotifications'));
const AdminReports            = lazy(() => import('@/pages/admin/AdminReports'));
const AdminDisputes           = lazy(() => import('@/pages/admin/AdminDisputes'));
const AdminPriceEdits         = lazy(() => import('@/pages/admin/AdminPriceEdits'));
const AdminDeletions          = lazy(() => import('@/pages/admin/AdminDeletions'));

class ErrorBoundary extends Component {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  componentDidCatch(error, info) {
    console.error('[CampusRun crash]', error, info);
  }
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
      <img src="/logo.png" alt="Loading" className="w-10 h-10 rounded-xl animate-pulse" />
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <img src="/logo.png" alt="Loading" className="w-14 h-14 rounded-2xl animate-pulse" />
    </div>
  );
}
