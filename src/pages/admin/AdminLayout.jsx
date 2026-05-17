import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Package, Users, Bike, Banknote,
  Bell, BarChart2, LogOut, ChevronRight, Menu, X,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { to: '/admin',               label: 'Overview',       icon: LayoutDashboard, end: true },
  { to: '/admin/deliveries',    label: 'Deliveries',     icon: Package },
  { to: '/admin/users',         label: 'Users',          icon: Users },
  { to: '/admin/couriers',      label: 'Couriers',       icon: Bike },
  { to: '/admin/withdrawals',   label: 'Withdrawals',    icon: Banknote },
  { to: '/admin/notifications', label: 'Notifications',  icon: Bell },
  { to: '/admin/reports',       label: 'Reports',        icon: BarChart2 },
];

export default function AdminLayout() {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const currentPage = NAV.find(n => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));

  return (
    <div className="flex h-screen bg-[#080812] overflow-hidden font-sans">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-30 w-60 flex flex-col shrink-0
        bg-surface-900 border-r border-white/[0.06] transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="CampusRun" className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-brand-500/30" />
              <div>
                <p className="text-white font-bold text-sm tracking-tight">CampusRun</p>
                <p className="text-[10px] text-brand-400 font-semibold uppercase tracking-[0.15em]">Admin Console</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-300 shadow-sm'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-white/[0.05]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-brand-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-brand-400/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
          <div className="px-3 py-2 rounded-xl bg-white/[0.03]">
            <p className="text-[11px] text-gray-500 mb-0.5">Signed in as</p>
            <p className="text-xs text-white font-medium truncate">{profile?.full_name || profile?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-14 flex items-center gap-4 px-6 border-b border-white/[0.06] bg-surface-900/50 backdrop-blur-sm">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentPage?.label || 'Admin'}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Live
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
