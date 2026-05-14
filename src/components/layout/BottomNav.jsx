import { NavLink } from 'react-router-dom';
import { useMode } from '@/context/ModeContext';
import { useAuth } from '@/context/AuthContext';
import { Home, Clock, Wallet, Bike, Bell, User } from 'lucide-react';

export default function BottomNav() {
  const { mode } = useMode();
  const { profile } = useAuth();
  const isCourier = mode === 'courier';

  const buyerTabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/orders', icon: Clock, label: 'Orders' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const courierTabs = [
    { to: '/courier', icon: Bike, label: 'Deliveries' },
    { to: '/courier/notifications', icon: Bell, label: 'Alerts' },
    { to: '/courier/earnings', icon: Wallet, label: 'Earnings' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const adminTabs = profile?.is_admin ? [
    { to: '/admin', icon: Home, label: 'Admin' },
  ] : [];

  const tabs = isCourier ? courierTabs : buyerTabs;

  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-bottom z-10">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/courier'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
        {adminTabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
