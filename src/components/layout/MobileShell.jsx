import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '@/context/ModeContext';
import { useAuth } from '@/context/AuthContext';
import BottomNav from './BottomNav';
import Logo from '@/components/ui/Logo';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function MobileShell({ children }) {
  const { mode, toggleMode } = useMode();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  usePushNotifications();

  const isCourier = mode === 'courier';

  function handleToggle() {
    toggleMode();
    navigate(isCourier ? '/' : '/courier');
  }

  return (
    <div className="app-shell flex flex-col max-w-md mx-auto bg-surface-950 shadow-2xl relative overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[999] focus:bg-brand-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Header */}
      <header className="relative flex items-center px-4 py-3 bg-surface-900 border-b border-white/[0.08] safe-top shrink-0 z-10 overflow-hidden">
        <Logo size={38} />

        {profile && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Buyer/Courier toggle */}
            <button
              onClick={handleToggle}
              aria-label={`Switch to ${isCourier ? 'buyer' : 'courier'} mode`}
              className="relative flex items-center bg-surface-800 border border-white/[0.06] rounded-full p-0.5"
            >
              <span
                aria-hidden="true"
                className={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-full bg-brand-500 shadow transition-transform duration-200 ease-in-out ${
                  isCourier ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0.5'
                }`}
              />
              <span className={`relative z-10 px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${!isCourier ? 'text-white' : 'text-gray-500'}`}>Buyer</span>
              <span className={`relative z-10 px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${isCourier ? 'text-white' : 'text-gray-500'}`}>Courier</span>
            </button>
          </div>
        )}
      </header>

      {/* Scrollable content */}
      <main id="main-content" role="main" ref={contentRef} className="flex-1 overflow-y-auto pb-nav bg-surface-950">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />

    </div>
  );
}
