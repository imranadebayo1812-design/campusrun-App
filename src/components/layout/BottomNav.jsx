import { NavLink, useNavigate } from 'react-router-dom';
import { useMode } from '@/context/ModeContext';
import { Home, Clock, Wallet, Bike, User, Plus } from 'lucide-react';

export default function BottomNav() {
  const { mode } = useMode();
  const navigate = useNavigate();
  const isCourier = mode === 'courier';

  const courierTabs = [
    { to: '/courier', icon: Bike, label: 'Deliveries' },
    { to: '/courier/earnings', icon: Wallet, label: 'Wallet' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  if (isCourier) {
    return (
      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-900 border-t border-white/[0.08] safe-bottom z-10">
        <div className="flex">
          {courierTabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/courier'}
              aria-label={label}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-brand-400' : 'text-gray-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span aria-current={isActive ? 'page' : undefined}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface-900 border-t border-white/[0.08] safe-bottom z-10">
      <div className="flex items-end">
        <NavLink
          to="/"
          end
          aria-label="Home"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-400' : 'text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Home className="w-5 h-5" aria-hidden="true" />
              <span aria-current={isActive ? 'page' : undefined}>Home</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/orders"
          aria-label="Orders"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-400' : 'text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Clock className="w-5 h-5" aria-hidden="true" />
              <span aria-current={isActive ? 'page' : undefined}>Orders</span>
            </>
          )}
        </NavLink>

        {/* Center floating New Delivery button */}
        <div className="flex-1 flex flex-col items-center pb-1.5">
          <button
            onClick={() => navigate('/create-order')}
            aria-label="Create new delivery"
            className="w-13 h-13 bg-brand-500 hover:bg-brand-600 active:scale-95 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/40 transition-all -mt-6"
            style={{ width: 52, height: 52 }}
          >
            <Plus className="w-6 h-6 text-black" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <span className="text-xs font-medium text-gray-500 mt-1" aria-hidden="true">New</span>
        </div>

        <NavLink
          to="/wallet"
          aria-label="Wallet"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-400' : 'text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Wallet className="w-5 h-5" aria-hidden="true" />
              <span aria-current={isActive ? 'page' : undefined}>Wallet</span>
            </>
          )}
        </NavLink>

        <NavLink
          to="/profile"
          aria-label="Profile"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-400' : 'text-gray-500'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <User className="w-5 h-5" aria-hidden="true" />
              <span aria-current={isActive ? 'page' : undefined}>Profile</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
