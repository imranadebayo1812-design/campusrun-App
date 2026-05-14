import { useRef } from 'react';
import { useMode } from '@/context/ModeContext';
import { useAuth } from '@/context/AuthContext';
import BottomNav from './BottomNav';
import Logo from '@/components/ui/Logo';

export default function MobileShell({ children }) {
  const { mode, toggleMode } = useMode();
  const { profile } = useAuth();
  const contentRef = useRef(null);

  const isCourier = mode === 'courier';

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-surface-950 shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-surface-900 border-b border-white/[0.08] safe-top shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          <Logo size={38} />
        </div>

        {profile && (
          <div className="flex bg-surface-800 rounded-full p-0.5 gap-0.5">
            <button
              onClick={() => !isCourier || toggleMode()}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                !isCourier
                  ? 'bg-brand-500 text-white shadow'
                  : 'text-gray-400'
              }`}
            >
              Buyer
            </button>
            <button
              onClick={() => isCourier || toggleMode()}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isCourier
                  ? 'bg-brand-500 text-white shadow'
                  : 'text-gray-400'
              }`}
            >
              Courier
            </button>
          </div>
        )}
      </header>

      {/* Scrollable content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto pb-nav bg-surface-950">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
