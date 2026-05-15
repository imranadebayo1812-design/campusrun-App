import { NavLink } from 'react-router-dom';
import { useMode } from '@/context/ModeContext';
import { Home, Clock, Wallet, Bike, Map, User } from 'lucide-react';

export default function BottomNav() {
  const { mode } = useMode();
  const isCourier = mode === 'courier';

  const buyerTabs = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/orders', icon: Clock, label: 'Orders' },
    { to: '/wallet', icon: Wallet, label: 'Wallet' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const courierTabs = [
    { to: '/courier', icon: Bike, label: 'Deliveries' },
    { to: '/courier/map', icon: Map, label: 'Map' },
    { to: '/courier/earnings', icon: Wallet, label: 'Wallet' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const tabs = isCourier ? courierTabs : buyerTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-900 border-t border-white/[0.08] safe-bottom z-10">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/courier'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-400' : 'text-gray-500'
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
