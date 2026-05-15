import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MOCK_ORDERS } from '@/lib/mockData';
import { Package, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_DOT = {
  placed:     'bg-yellow-400',
  bought:     'bg-blue-400',
  on_the_way: 'bg-brand-400',
  arrived:    'bg-indigo-400',
  delivered:  'bg-green-400',
  cancelled:  'bg-red-400',
};
const STATUS_LABEL = {
  placed: 'Waiting', bought: 'Bought', on_the_way: 'On The Way',
  arrived: 'Arrived', delivered: 'Delivered', cancelled: 'Cancelled',
};
const ACTIVE_STATUSES = ['placed', 'bought', 'on_the_way', 'arrived'];

const STATUS_LABEL = {
  placed:     'Waiting',
  bought:     'Bought',
  on_the_way: 'On The Way',
  arrived:    'Arrived',
  delivered:  'Delivered',
  cancelled:  'Cancelled',
};

const ACTIVE_STATUSES = ['placed', 'bought', 'on_the_way', 'arrived'];

function OrderCard({ order }) {
  const navigate = useNavigate();
  const isActive = ACTIVE_STATUSES.includes(order.status);
  return (
    <button
      onClick={() => navigate(`/track/${order.id}`)}
      className="w-full bg-surface-900 border border-white/[0.08] rounded-2xl p-4 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-brand-500/15' : 'bg-surface-800'}`}>
        <Package className={`w-5 h-5 ${isActive ? 'text-brand-400' : 'text-gray-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{order.pickup_location}</p>
        <p className="text-xs text-gray-500">→ {order.dropoff_location}</p>
        <p className="text-xs text-gray-600 mt-0.5">
          {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
          <span className="text-xs font-medium text-gray-400">{STATUS_LABEL[order.status]}</span>
        </div>
        <p className="text-sm font-bold text-white">₦{order.total_amount?.toLocaleString()}</p>
      </div>
    </button>
  );
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');

  const orders = [...MOCK_ORDERS];
  const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const inProgress = orders.filter(o => ['on_the_way', 'arrived'].includes(o.status));
  const completed = orders.filter(o => o.status === 'delivered');

  const filtered = { all: orders, active, in_progress: inProgress, completed }[filter] || orders;

  const tabs = [
    { key: 'all', label: 'All', count: orders.length },
    { key: 'active', label: 'Active', count: active.length },
    { key: 'in_progress', label: 'In Progress', count: inProgress.length },
    { key: 'completed', label: 'Completed', count: completed.length },
  ];

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">My Orders</h1>
        <button
          onClick={() => navigate('/create-order')}
          className="w-8 h-8 bg-brand-500 rounded-xl flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-900 text-gray-400 border border-white/[0.08]'
              }`}
            >
              {tab.label}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${
                filter === tab.key ? 'bg-white/20 text-white' : 'bg-surface-800 text-gray-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Order list */}
      <div className="px-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No orders here</p>
            <p className="text-gray-600 text-sm mt-1">
              {filter === 'all' ? 'Place your first delivery order' : 'No orders in this category'}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => navigate('/create-order')}
                className="mt-4 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
              >
                Create Order
              </button>
            )}
          </div>
        ) : (
          filtered.map(o => <OrderCard key={o.id} order={o} />)
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}
