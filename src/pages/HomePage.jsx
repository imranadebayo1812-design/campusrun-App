import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { MOCK_ORDERS, MOCK_VENDORS } from '@/lib/mockData';
import { isOrderingOpen, orderingClosedMessage } from '@/lib/restaurantHours';
import { Search, ChevronRight, Package, AlertCircle, Wallet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_LABEL = {
  placed: 'Waiting for courier',
  bought: 'Bought',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const STATUS_COLOR = {
  placed: 'text-yellow-400',
  bought: 'text-blue-400',
  on_the_way: 'text-brand-400',
  arrived: 'text-indigo-400',
  delivered: 'text-green-400',
  cancelled: 'text-red-400',
};

const STATUS_DOT = {
  placed: 'bg-yellow-400',
  bought: 'bg-blue-400',
  on_the_way: 'bg-brand-400',
  arrived: 'bg-indigo-400',
  delivered: 'bg-green-400',
  cancelled: 'bg-red-400',
};

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'food', label: '🍽️ Food' },
  { key: 'snacks', label: '🍟 Snacks' },
  { key: 'drinks', label: '☕ Drinks' },
  { key: 'shopping', label: '🛒 Shopping' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const open = isOrderingOpen();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const activeOrders = MOCK_ORDERS
    .filter(o => ['placed', 'bought', 'on_the_way', 'arrived'].includes(o.status))
    .slice(0, 3);

  const firstName = (profile?.full_name || 'Student').split(' ')[0];
  const balance = profile?.wallet_balance || 0;

  const filteredVendors = MOCK_VENDORS.filter(v => {
    const matchCategory = category === 'all' || v.category === category;
    if (!search.trim()) return matchCategory;
    const q = search.toLowerCase();
    return matchCategory && (
      v.name.toLowerCase().includes(q) ||
      v.zone.toLowerCase().includes(q) ||
      v.items.some(i => i.name.toLowerCase().includes(q))
    );
  });

  function openVendor(vendor) {
    navigate('/create-order', {
      state: { type: 'purchase', vendor: vendor.zone, vendorId: vendor.id },
    });
  }

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-gray-500 text-xs font-medium">Good day,</p>
          <h2 className="text-xl font-bold text-white">{firstName} 👋</h2>
        </div>
        <button
          onClick={() => navigate('/wallet')}
          className="flex items-center gap-2 bg-surface-900 border border-white/[0.08] rounded-2xl px-3 py-2 active:scale-[0.97] transition-transform"
        >
          <Wallet className="w-4 h-4 text-brand-400" />
          <div className="text-right">
            <p className="text-xs text-gray-500 leading-none">Wallet</p>
            <p className="text-sm font-bold text-white leading-tight">₦{balance.toLocaleString()}</p>
          </div>
        </button>
      </div>

      {/* Ordering hours warning */}
      {!open && (
        <div className="mx-4 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{orderingClosedMessage()}</span>
        </div>
      )}

      {/* Search bar */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search vendors, food, items…"
            className="w-full bg-surface-900 border border-white/[0.08] rounded-2xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
      </div>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active Orders</p>
            <button
              onClick={() => navigate('/orders')}
              className="text-brand-400 text-xs font-semibold flex items-center gap-0.5"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {activeOrders.map(order => (
              <button
                key={order.id}
                onClick={() => navigate(`/track/${order.id}`)}
                className="w-full bg-surface-900 border border-white/[0.08] rounded-2xl p-3.5 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-9 h-9 bg-brand-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{order.pickup_location}</p>
                  <p className="text-gray-500 text-xs">→ {order.dropoff_location}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
                    <p className={`text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </p>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category chips */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                category === c.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-900 text-gray-400 border border-white/[0.08]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vendor grid */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
            {search ? `Results for "${search}"` : category === 'all' ? 'All Vendors' : CATEGORIES.find(c => c.key === category)?.label}
          </p>
          <span className="text-xs text-gray-600">{filteredVendors.length} vendors</span>
        </div>

        {filteredVendors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm font-medium">No vendors found</p>
            <p className="text-gray-600 text-xs mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredVendors.map(vendor => (
              <button
                key={vendor.id}
                onClick={() => openVendor(vendor)}
                className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
              >
                <div className={`w-10 h-10 ${vendor.color} rounded-xl flex items-center justify-center mb-3 text-lg`}>
                  {vendor.emoji}
                </div>
                <p className="font-semibold text-white text-sm leading-tight">{vendor.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{vendor.zone}</p>
                <p className="text-xs text-gray-600 mt-2 truncate">
                  {vendor.items[0].name} · <span className="text-gray-500">₦{vendor.items[0].price.toLocaleString()}</span>
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-6" />
    </div>
  );
}
