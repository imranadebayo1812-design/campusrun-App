import { NavLink, useNavigate } from 'react-router-dom';
import { useMode } from '@/context/ModeContext';
import { Home, Clock, Wallet, Bike, User, Plus } from 'lucide-react';

const NAV_CLASSES = 'fixed bottom-0 left-0 right-0 max-w-xl mx-auto safe-bottom z-10';
const NAV_INNER  = 'bg-surface-950/95 backdrop-blur-2xl border-t border-white/[0.06]';

function Tab({ icon: Icon, label, isActive }) {
  return (
    <>
      <div className={`flex items-center justify-center rounded-2xl transition-all duration-150 w-10 h-10 ${
        isActive ? 'bg-brand-500/15' : ''
      }`}>
        <Icon className={`w-[22px] h-[22px] transition-colors duration-150 ${
          isActive ? 'text-brand-400' : 'text-gray-600'
        }`} aria-hidden="true" />
      </div>
      <span className={`text-[10px] font-semibold tracking-wide transition-all duration-150 leading-none ${
        isActive ? 'text-brand-400 opacity-100 max-h-4' : 'opacity-0 max-h-0 overflow-hidden'
      }`}>
        {label}
      </span>
    </>
  );
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
          {courierTabs.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/courier'}
              aria-label={label}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[52px]"
            >
              {({ isActive }) => <Tab icon={icon} label={label} isActive={isActive} />}
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
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[52px]">
          {({ isActive }) => <Tab icon={Home} label="Home" isActive={isActive} />}
        </NavLink>

        {/* Orders */}
        <NavLink to="/orders" aria-label="Orders"
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[52px]">
          {({ isActive }) => <Tab icon={Clock} label="Orders" isActive={isActive} />}
        </NavLink>

        {/* FAB — elevated centre button */}
        <div className="flex-1 flex flex-col items-center pb-1">
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
              marginTop: -20,
            }}
          >
            <Plus className="w-6 h-6 text-white" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {/* Wallet */}
        <NavLink to="/wallet" aria-label="Wallet"
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[52px]">
          {({ isActive }) => <Tab icon={Wallet} label="Wallet" isActive={isActive} />}
        </NavLink>

        {/* Profile */}
        <NavLink to="/profile" aria-label="Profile"
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[52px]">
          {({ isActive }) => <Tab icon={User} label="Profile" isActive={isActive} />}
        </NavLink>
      </div>
    </nav>
  );
}
