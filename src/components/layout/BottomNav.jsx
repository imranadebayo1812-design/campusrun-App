import { NavLink, useNavigate } from 'react-router-dom';
import { useMode } from '@/context/ModeContext';
import { Home, Clock, Wallet, Bike, User, Plus } from 'lucide-react';

const NAV_CLASSES = 'fixed bottom-0 left-0 right-0 max-w-md mx-auto safe-bottom z-10';
const NAV_INNER  = 'glass border-t border-white/[0.06]';

function tabClass(isActive) {
  return `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium transition-all duration-200 ${
    isActive
      ? 'text-brand-400 [filter:drop-shadow(0_0_6px_#00d1ff)]'
      : 'text-gray-600 hover:text-gray-400'
  }`;
}

export default function BottomNav() {
  const { mode } = useMode();
  const navigate  = useNavigate();
  const isCourier = mode === 'courier';

  const courierTabs = [
    { to: '/courier',          icon: Bike,   label: 'Deliveries' },
    { to: '/courier/earnings', icon: Wallet, label: 'Wallet'     },
    { to: '/profile',          icon: User,   label: 'Profile'    },
  ];

  if (isCourier) {
    return (
      <nav aria-label="Main navigation" className={NAV_CLASSES}>
        <div className={`${NAV_INNER} flex`}>
          {courierTabs.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/courier'}
              aria-label={label}
              className={({ isActive }) => tabClass(isActive)}
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
    <nav aria-label="Main navigation" className={NAV_CLASSES}>
      <div className={`${NAV_INNER} flex items-end`}>
        {/* Home */}
        <NavLink to="/" end aria-label="Home"
          className={({ isActive }) => tabClass(isActive)}>
          {({ isActive }) => (
            <>
              <Home className="w-5 h-5" aria-hidden="true" />
              <span aria-current={isActive ? 'page' : undefined}>Home</span>
            </>
          )}
        </NavLink>

        {/* Orders */}
        <NavLink to="/orders" aria-label="Orders"
          className={({ isActive }) => tabClass(isActive)}>
          {({ isActive }) => (
            <>
              <Clock className="w-5 h-5" aria-hidden="true" />
              <span aria-current={isActive ? 'page' : undefined}>Orders</span>
            </>
          )}
        </NavLink>

        {/* FAB — elevated centre button */}
        <div className="flex-1 flex flex-col items-center pb-1.5">
          <button
            onClick={() => navigate('/create-order')}
            aria-label="Create new delivery"
            className="active:scale-95 transition-transform"
            style={{
              width: 52, height: 52,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #00d1ff 0%, #0080ff 100%)',
              boxShadow: '0 0 20px rgba(0,209,255,0.45), 0 4px 12px rgba(0,0,0,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -24,
            }}
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} aria-hidden="true" />
          </button>
          <span className="text-xs font-medium text-gray-600 mt-1" aria-hidden="true">New</span>
        </div>

        {/* Wallet */}
        <NavLink to="/wallet" aria-label="Wallet"
          className={({ isActive }) => tabClass(isActive)}>
          {({ isActive }) => (
            <>
              <Wallet className="w-5 h-5" aria-hidden="true" />
              <span aria-current={isActive ? 'page' : undefined}>Wallet</span>
            </>
          )}
        </NavLink>

        {/* Profile */}
        <NavLink to="/profile" aria-label="Profile"
          className={({ isActive }) => tabClass(isActive)}>
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
