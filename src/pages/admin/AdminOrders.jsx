import { useState } from 'react';
import { MOCK_ADMIN_ORDERS } from '@/lib/mockData';
import { Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'placed', label: 'Placed' },
  { key: 'bought', label: 'Bought' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'arrived', label: 'Arrived' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'errand', label: 'Errands' },
];

const STATUS_COLORS = {
  placed: 'bg-yellow-500/15 text-yellow-400',
  bought: 'bg-blue-500/15 text-blue-400',
  on_the_way: 'bg-brand-500/15 text-brand-400',
  arrived: 'bg-indigo-500/15 text-indigo-400',
  delivered: 'bg-green-500/15 text-green-400',
  cancelled: 'bg-red-500/15 text-red-400',
  flagged: 'bg-orange-500/15 text-orange-400',
};

export default function AdminOrders() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const orders = MOCK_ADMIN_ORDERS.filter(o => {
    const matchFilter = filter === 'all'
      ? true
      : filter === 'errand'
        ? o.order_type === 'errand'
        : o.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || [o.id, o.buyer_name, o.pickup_location, o.dropoff_location]
      .some(f => f?.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search orders, users, locations…"
          className="w-full bg-surface-800 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === f.key
                ? 'bg-brand-500 text-white'
                : 'bg-surface-800 text-gray-400 border border-white/[0.08]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div className="space-y-2">
        {orders.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No orders match this filter</p>
        ) : (
          orders.map(order => (
            <div
              key={order.id}
              className="bg-surface-900 border border-white/[0.08] rounded-xl p-4 flex items-start justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs font-mono text-gray-500">#{order.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[order.status] || 'bg-gray-700 text-gray-400'}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                  {order.order_type === 'errand' && (
                    <span className="text-xs bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full">Errand</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-white">{order.buyer_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{order.pickup_location} → {order.dropoff_location}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">₦{order.total_amount.toLocaleString()}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
