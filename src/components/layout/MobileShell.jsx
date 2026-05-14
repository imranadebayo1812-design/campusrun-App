import { useRef } from 'react';
import { useMode } from '@/context/ModeContext';
import { useAuth } from '@/context/AuthContext';
import { Package, ToggleLeft, ToggleRight } from 'lucide-react';
import BottomNav from './BottomNav';

export default function MobileShell({ children }) {
  const { mode, toggleMode } = useMode();
  const { profile } = useAuth();
  const contentRef = useRef(null);

  const isCourier = mode === 'courier';

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-2xl overflow-hidden relative">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 safe-top shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">CampusRun</span>
        </div>

        {profile && (
          <button
            onClick={toggleMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isCourier
                ? 'bg-green-100 text-green-700'
                : 'bg-brand-100 text-brand-700'
            }`}
          >
            {isCourier ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            {isCourier ? 'Courier' : 'Buyer'}
          </button>
        )}
      </header>

      {/* Scrollable content */}
      <main ref={contentRef} className="flex-1 overflow-y-auto pb-nav">
        {children}
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  );
}
