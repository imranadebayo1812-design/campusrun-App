import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_ACTIVE_DELIVERY, MOCK_EARNINGS } from '@/lib/mockData';
import { Bike, MapPin, Package, Lock, CheckCircle, Wallet, TrendingUp, Star, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_ACTIONS = {
  placed:     { label: 'Mark as Bought',    next: 'bought',     color: 'bg-blue-600' },
  bought:     { label: 'Mark On The Way',   next: 'on_the_way', color: 'bg-brand-600' },
  on_the_way: { label: 'Mark as Arrived',   next: 'arrived',    color: 'bg-indigo-600' },
  arrived:    { label: 'Verify Delivery Code', next: 'delivered', color: 'bg-green-600', requiresCode: true },
};

const STATUS_COLOR = {
  placed:     'text-yellow-400 bg-yellow-400/10',
  bought:     'text-blue-400 bg-blue-400/10',
  on_the_way: 'text-brand-400 bg-brand-400/10',
  arrived:    'text-indigo-400 bg-indigo-400/10',
};

function DeliveryCodeModal({ delivery, onSuccess, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  function verify() {
    if (code.length !== 4) { setError('Enter the 4-digit code'); return; }
    if (code !== delivery.delivery_code) {
      setError('Incorrect code. Ask the buyer for the correct 4-digit code.');
      return;
    }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4 border border-white/10" style={{ backgroundColor: '#1a1a2e' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-400" />
            <p className="font-semibold text-white">Enter Delivery Code</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-lg font-bold">×</button>
        </div>
        <p className="text-sm text-gray-400">Ask the buyer for their 4-digit code to confirm delivery.</p>
        <input
          type="number"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={e => { setCode(e.target.value.slice(0, 4)); setError(''); }}
          placeholder="0000"
          className="w-full text-center text-4xl font-bold tracking-[0.5em] bg-surface-800 border-2 border-white/[0.08] text-white rounded-xl py-4 focus:outline-none focus:border-brand-500"
        />
        {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        <button
          onClick={verify}
          disabled={code.length !== 4}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Confirm Delivery
        </button>
      </div>
    </div>
  );
}

export default function CourierDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [activeOrders, setActiveOrders] = useState(
    MOCK_ACTIVE_DELIVERY ? [MOCK_ACTIVE_DELIVERY] : []
  );
  const [verifyDelivery, setVerifyDelivery] = useState(null);
  const [updating, setUpdating] = useState(null);

  const openCount = activeOrders.filter(o => o.status === 'placed').length;
  const activeCount = activeOrders.filter(o => ['bought', 'on_the_way'].includes(o.status)).length;
  const doneCount = activeOrders.filter(o => o.status === 'arrived').length;

  if (!profile?.is_courier) {
    return (
      <div className="bg-surface-950 min-h-full p-4 text-center py-20">
        <div className="w-16 h-16 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bike className="w-8 h-8 text-gray-600" />
        </div>
        <p className="font-semibold text-white text-lg">Courier mode not active</p>
        <p className="text-sm text-gray-500 mt-1">Enable courier mode in your profile</p>
        <button onClick={() => navigate('/profile')} className="mt-5 bg-brand-500 text-white px-6 py-3 rounded-xl text-sm font-semibold">
          Go to Profile
        </button>
      </div>
    );
  }

  async function updateStatus(delivery, nextStatus) {
    if (STATUS_ACTIONS[delivery.status]?.requiresCode) { setVerifyDelivery(delivery); return; }
    setUpdating(delivery.id);
    await new Promise(r => setTimeout(r, 600));
    setActiveOrders(prev => prev.map(o => o.id === delivery.id ? { ...o, status: nextStatus } : o));
    setUpdating(null);
  }

  const stats = [
    {
      label: 'Total Deliveries', value: MOCK_EARNINGS.deliveries_week,
      sub: `${MOCK_EARNINGS.deliveries_today} today`,
      icon: CheckCircle, iconColor: 'text-green-400', iconBg: 'bg-green-500/15',
    },
    {
      label: 'Total Earned', value: `₦${MOCK_EARNINGS.this_week.toLocaleString()}`,
      sub: `₦${MOCK_EARNINGS.today.toLocaleString()} today`,
      icon: Wallet, iconColor: 'text-brand-400', iconBg: 'bg-brand-500/15',
    },
    {
      label: 'Daily Avg', value: `₦${Math.round(MOCK_EARNINGS.this_week / 7).toLocaleString()}`,
      sub: 'per day',
      icon: TrendingUp, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/15',
    },
    {
      label: 'Tips Received', value: `₦${MOCK_EARNINGS.tips.toLocaleString()}`,
      sub: `${MOCK_EARNINGS.deliveries_today} orders tipped`,
      icon: Star, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/15',
    },
  ];

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Courier Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Accept and manage deliveries</p>
        </div>
        <button
          onClick={() => setIsOnline(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all ${
            isOnline
              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
              : 'bg-surface-900 text-gray-400 border border-white/[0.08]'
          }`}
        >
          <Power className="w-4 h-4" />
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* 2×2 stat cards */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          {stats.map(({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
            <div key={label} className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
              <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <p className={`text-2xl font-bold ${iconColor}`}>{value}</p>
              <p className="text-sm text-gray-300 mt-0.5 font-medium">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* OPEN / ACTIVE / DONE pills */}
      <div className="px-4 mb-4">
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-3 grid grid-cols-3 divide-x divide-white/[0.08]">
          {[
            { label: 'OPEN', count: openCount, color: 'text-white' },
            { label: 'ACTIVE', count: activeCount, color: 'text-brand-400' },
            { label: 'DONE', count: doneCount, color: 'text-green-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center px-2 py-1">
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-gray-500 text-xs font-semibold tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Offline state / Active deliveries */}
      <div className="px-4">
        {!isOnline ? (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-surface-800 rounded-full flex items-center justify-center mb-4">
              <Power className="w-7 h-7 text-gray-500" />
            </div>
            <p className="text-white font-semibold text-base">You are offline</p>
            <p className="text-gray-500 text-sm mt-1.5">Go online to see and accept new orders</p>
            <button
              onClick={() => setIsOnline(true)}
              className="mt-5 bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              Go Online
            </button>
          </div>
        ) : activeOrders.filter(o => o.status !== 'delivered').length === 0 ? (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Bike className="w-7 h-7 text-green-400" />
            </div>
            <p className="text-white font-semibold">Looking for orders…</p>
            <p className="text-gray-500 text-sm mt-1.5">New delivery requests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.filter(o => o.status !== 'delivered').map(delivery => {
              const action = STATUS_ACTIONS[delivery.status];
              return (
                <div key={delivery.id} className="bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[delivery.status]}`}>
                          {delivery.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500 uppercase font-mono">{delivery.order_type}</span>
                      </div>
                      <p className="text-lg font-bold text-green-400">₦{delivery.delivery_fee?.toLocaleString()}</p>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Pickup</p>
                          <p className="text-sm font-medium text-white">{delivery.pickup_location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Dropoff</p>
                          <p className="text-sm font-medium text-white">{delivery.dropoff_location}</p>
                        </div>
                      </div>
                    </div>
                    {delivery.order_type === 'purchase' && delivery.items?.length > 0 && (
                      <div className="bg-surface-800 border border-white/[0.06] rounded-xl p-3 mb-3">
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">Items to buy:</p>
                        {delivery.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-gray-300">
                            <span>{item.qty}× {item.name}</span>
                            <span>₦{(parseFloat(item.price) * item.qty).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t border-white/[0.08] mt-1.5 pt-1.5 flex justify-between text-xs font-semibold">
                          <span className="text-gray-400">Food cost (reimburse)</span>
                          <span className="text-green-400">+₦{delivery.food_cost?.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                    {delivery.special_instructions && (
                      <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5 mb-3">
                        📝 {delivery.special_instructions}
                      </p>
                    )}
                    {action && (
                      <button
                        onClick={() => updateStatus(delivery, action.next)}
                        disabled={updating === delivery.id}
                        className={`w-full ${action.color} text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50`}
                      >
                        {action.requiresCode && <Lock className="w-4 h-4" />}
                        {updating === delivery.id ? 'Updating…' : action.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-6" />

      {verifyDelivery && (
        <DeliveryCodeModal
          delivery={verifyDelivery}
          onSuccess={() => {
            setActiveOrders(prev => prev.map(o => o.id === verifyDelivery.id ? { ...o, status: 'delivered' } : o));
            setVerifyDelivery(null);
          }}
          onClose={() => setVerifyDelivery(null)}
        />
      )}
    </div>
  );
}
