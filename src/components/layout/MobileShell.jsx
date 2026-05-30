import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMode } from '@/context/ModeContext';
import { useAuth } from '@/context/AuthContext';
import BottomNav from './BottomNav';
import Logo from '@/components/ui/Logo';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const PULL_THRESHOLD = 68; // px before triggering refresh

export default function MobileShell({ children }) {
  const { mode, toggleMode } = useMode();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  const touchStartY = useRef(0);
  const pulling = useRef(false);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  usePushNotifications();

  // Attach touch listeners as non-passive so preventDefault() works inside
  // Capacitor WebView — React synthetic touch events are passive by default
  // which means the WebView swallows the gesture before our handler runs.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    function start(e) {
      if (el.scrollTop > 0) return;
      touchStartY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function move(e) {
      if (!pulling.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) { setPullY(0); return; }
      e.preventDefault(); // stops WebView overscroll interfering
      setPullY(Math.min(delta * 0.45, PULL_THRESHOLD + 16));
    }

    function end() {
      if (!pulling.current) return;
      pulling.current = false;
      setPullY(prev => {
        if (prev >= PULL_THRESHOLD) {
          setRefreshing(true);
          setTimeout(() => window.location.reload(), 400);
          return PULL_THRESHOLD;
        }
        return 0;
      });
    }

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove',  move,  { passive: false });
    el.addEventListener('touchend',   end,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove',  move);
      el.removeEventListener('touchend',   end);
    };
  }, []);

  const isCourier = mode === 'courier';

  function handleToggle() {
    toggleMode();
    navigate(isCourier ? '/' : '/courier');
  }

  const showIndicator = pullY > 6 || refreshing;
  const ready = pullY >= PULL_THRESHOLD || refreshing;

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

      {/* Pull-to-refresh indicator */}
      {showIndicator && (
        <div
          className="absolute left-0 right-0 flex justify-center z-20 pointer-events-none"
          style={{ top: 57 + Math.min(pullY, PULL_THRESHOLD) * 0.4 }}
        >
          <div className={`flex items-center gap-2 bg-surface-900 border rounded-full px-3 py-1.5 shadow-lg transition-colors ${ready ? 'border-brand-500/40' : 'border-white/[0.08]'}`}>
            <div className={`w-4 h-4 rounded-full border-2 ${ready ? 'border-brand-500/40 border-t-brand-500 animate-spin' : 'border-gray-600 border-t-gray-400'}`}
                 style={!ready ? { transform: `rotate(${(pullY / PULL_THRESHOLD) * 240}deg)` } : undefined} />
            <span className="text-xs text-gray-400">{ready ? 'Refreshing…' : 'Pull to refresh'}</span>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <main
        id="main-content"
        role="main"
        ref={contentRef}
        className="flex-1 overflow-y-auto pb-nav bg-surface-950"
        style={{ transform: pullY > 0 ? `translateY(${Math.min(pullY, PULL_THRESHOLD) * 0.3}px)` : undefined, transition: pulling.current ? undefined : 'transform 0.2s ease' }}
      >
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />

    </div>
  );
}

