import { useState } from 'react';
import { MOCK_ADMIN_STATS } from '@/lib/mockData';
import { LayoutDashboard, Package, Users, Bike, UtensilsCrossed, Star, Banknote, Tag, ShieldBan, Gift, ShieldAlert } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import AdminOrders from './AdminOrders';
import AdminUsers from './AdminUsers';
import AdminRunners from './AdminRunners';
import AdminTabStub from './AdminTabStub';

const TABS = [
  { key: 'orders',    label: 'Orders',          icon: Package,        component: <AdminOrders /> },
  { key: 'users',     label: 'Users',            icon: Users,          component: <AdminUsers /> },
  { key: 'runners',   label: 'Runners',          icon: Bike,           component: <AdminRunners /> },
  { key: 'menu',      label: 'Menu',             icon: UtensilsCrossed, component: <AdminTabStub title="Menu Management" /> },
  { key: 'reviews',   label: 'Reviews',          icon: Star,           component: <AdminTabStub title="Reviews" /> },
  { key: 'fees',      label: 'Fees',             icon: Tag,            component: <AdminTabStub title="Fee Configuration" /> },
  { key: 'payouts',   label: 'Payouts',          icon: Banknote,       component: <AdminTabStub title="Payouts" /> },
  { key: 'prices',    label: 'Prices',           icon: Tag,            component: <AdminTabStub title="Price Management" /> },
  { key: 'block',     label: 'Block',            icon: ShieldBan,      component: <AdminTabStub title="Block List" /> },
  { key: 'referrals', label: 'Referrals',        icon: Gift,           component: <AdminTabStub title="Referrals" /> },
  { key: 'security',  label: 'Security & Fraud', icon: ShieldAlert,    component: <AdminTabStub title="Security & Fraud" /> },
];

export default function AdminApp() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const currentTab = TABS.find(t => t.key === activeTab);
  const isDashboard = activeTab === 'dashboard';

  return (
    <div className="min-h-screen bg-surface-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface-950 border-b border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-white hidden sm:block group-hover:text-brand-400 transition-colors">
                CAMPUS RUN – ADMIN
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-surface-900 border border-white/[0.08] rounded-full px-3 py-1.5">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-gray-300">{MOCK_ADMIN_STATS.online_users} online</span>
            </div>
            <div className="flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/20 rounded-full px-2.5 py-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400">Pro</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide border-t border-white/[0.06]">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 shrink-0 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-brand-500 text-brand-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {isDashboard ? (
          <AdminDashboard />
        ) : (
          <div>
            <h2 className="text-lg font-bold text-white mb-4">{currentTab?.label}</h2>
            {currentTab?.component}
          </div>
        )}
      </main>
    </div>
  );
}
