import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_ACTIVE_DELIVERY, MOCK_AVAILABLE_ORDERS, MOCK_EARNINGS } from '@/lib/mockData';
import { calculateDeliveryFee } from '@/lib/deliveryPricing';
import {
  Bike, MapPin, Package, Lock, CheckCircle, Wallet, TrendingUp,
  Star, Power, Clock, ShoppingBag, Truck, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

/* ── Delivery code verification modal ─────────────────────────── */
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
      <div className="w-full max-w-sm bg-surface-900 border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-400" aria-hidden="true" />
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
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl"
        >
          Confirm Delivery
        </button>
      </div>
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────────── */
function fmt(secs) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

function graceLeft(order) {
  if (!order.accepted_at) return 0;
  return Math.max(0, 120 - Math.floor((Date.now() - new Date(order.accepted_at).getTime()) / 1000));
}

function getEta(order) {
  try {
    const { distance_m } = calculateDeliveryFee(order.pickup_location, order.dropoff_location);
    if (distance_m) return `~${Math.max(2, Math.round(distance_m / 80))} min`;
  } catch {}
  return null;
}

const STATUS_NEXT = {
  placed:     { label: 'Mark as Bought',      next: 'bought',     color: 'from-blue-600 to-blue-700' },
  bought:     { label: 'Mark On The Way',     next: 'on_the_way', color: 'from-brand-500 to-indigo-600' },
  on_the_way: { label: 'Mark as Arrived',     next: 'arrived',    color: 'from-indigo-600 to-indigo-700' },
  arrived:    { label: 'Verify Delivery Code', next: 'delivered', color: 'from-green-600 to-green-700', requiresCode: true },
};

const STATUS_BADGE = {
  placed:     'text-yellow-400 bg-yellow-400/10',
  bought:     'text-blue-400 bg-blue-400/10',
  on_the_way: 'text-brand-400 bg-brand-400/10',
  arrived:    'text-indigo-400 bg-indigo-400/10',
};

const STATUS_LABEL = {
  placed: 'Order Placed', bought: 'Bought', on_the_way: 'On The Way', arrived: 'Arrived',
};

/* ── Main component ────────────────────────────────────────────── */
export default function CourierDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [tick, setTick] = useState(0);
  const [activeOrders, setActiveOrders] = useState(
    MOCK_ACTIVE_DELIVERY ? [{ ...MOCK_ACTIVE_DELIVERY }] : []
  );
  const [available, setAvailable] = useState([...MOCK_AVAILABLE_ORDERS]);
  const [verifyDelivery, setVerifyDelivery] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!profile?.is_courier) {
    return (
      <div className="bg-surface-950 min-h-full p-4 text-center py-20">
        <div className="w-16 h-16 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bike className="w-8 h-8 text-gray-600" />
        </div>
        <p className="font-semibold text-white text-lg">Courier mode not active</p>
        <p className="text-sm text-gray-500 mt-1">Enable courier mode in your profile to start earning.</p>
        <button onClick={() => navigate('/profile')} className="mt-5 bg-brand-500 text-white px-6 py-3 rounded-xl text-sm font-semibold">
          Go to Profile
        </button>
      </div>
    );
  }

  function acceptOrder(order) {
    setAvailable(prev => prev.filter(o => o.id !== order.id));
    setActiveOrders(prev => [...prev, { ...order, status: 'placed', delivery_code: '2508', accepted_at: new Date().toISOString() }]);
  }

  async function updateStatus(delivery, nextStatus) {
    if (STATUS_NEXT[delivery.status]?.requiresCode) { setVerifyDelivery(delivery); return; }
    const gl = graceLeft(delivery);
    if (delivery.status === 'placed' && gl > 0) return; // blocked by grace
    setUpdating(delivery.id);
    await new Promise(r => setTimeout(r, 500));
    setActiveOrders(prev => prev.map(o => o.id === delivery.id ? { ...o, status: nextStatus } : o));
    setUpdating(null);
  }

  const inProgress = activeOrders.filter(o => o.status !== 'delivered');
  const done = activeOrders.filter(o => o.status === 'delivered');
  const openCount = available.length;
  const activeCount = inProgress.filter(o => ['bought', 'on_the_way'].includes(o.status)).length;
  const doneCount = done.length;

  const stats = [
    { label: 'Total Deliveries', value: MOCK_EARNINGS.deliveries_week, sub: `${MOCK_EARNINGS.deliveries_today} today`, icon: CheckCircle, iconColor: 'text-green-400', iconBg: 'bg-green-500/15' },
    { label: 'Earned This Week', value: `₦${MOCK_EARNINGS.this_week.toLocaleString()}`, sub: `₦${MOCK_EARNINGS.today.toLocaleString()} today`, icon: Wallet, iconColor: 'text-brand-400', iconBg: 'bg-brand-500/15' },
    { label: 'Daily Average', value: `₦${Math.round(MOCK_EARNINGS.this_week / 7).toLocaleString()}`, sub: 'per day this week', icon: TrendingUp, iconColor: 'text-blue-400', iconBg: 'bg-blue-500/15' },
    { label: 'Tips Received', value: `₦${MOCK_EARNINGS.tips.toLocaleString()}`, sub: 'all time', icon: Star, iconColor: 'text-yellow-400', iconBg: 'bg-yellow-500/15' },
  ];

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Courier Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">You're on duty. Campus is counting on you.</p>
        </div>
        <button
          onClick={() => setIsOnline(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shrink-0 transition-all ${
            isOnline ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-surface-900 text-gray-400 border border-white/[0.08]'
          }`}
        >
          <Power className="w-4 h-4" aria-hidden="true" />
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        {stats.map(({ label, value, sub, icon: Icon, iconColor, iconBg }) => (
          <div key={label} className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
            <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${iconColor}`} aria-hidden="true" />
            </div>
            <p className={`text-2xl font-bold ${iconColor}`}>{value}</p>
            <p className="text-sm text-gray-300 mt-0.5 font-medium">{label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* OPEN / ACTIVE / DONE */}
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

      {/* Offline state */}
      {!isOnline && (
        <div className="px-4 mb-4">
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-surface-800 rounded-full flex items-center justify-center mb-4">
              <Power className="w-7 h-7 text-gray-500" aria-hidden="true" />
            </div>
            <p className="text-white font-semibold text-base">You're off duty</p>
            <p className="text-gray-500 text-sm mt-1.5">Toggle online above to start receiving delivery requests.</p>
            <button
              onClick={() => setIsOnline(true)}
              className="mt-5 bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm shadow-lg shadow-brand-500/20"
            >
              Start Accepting Deliveries
            </button>
          </div>
        </div>
      )}

      {/* My Active Deliveries */}
      {isOnline && inProgress.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">My Active Deliveries</p>
          <div className="space-y-3">
            {inProgress.map(delivery => {
              const action = STATUS_NEXT[delivery.status];
              const gl = graceLeft(delivery);
              const gracePeriodActive = gl > 0 && delivery.status === 'placed';
              const eta = getEta(delivery);
              const isBlocked = delivery.status === 'placed' && gl > 0;
              /* force re-render on tick changes to update countdown */
              void tick;

              return (
                <div key={delivery.id} className="bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
                  {/* Grace period banner */}
                  {gracePeriodActive && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-amber-400">Grace period: {fmt(gl)}</p>
                        <p className="text-xs text-amber-400/70">Both sides can cancel freely</p>
                      </div>
                      <button
                        onClick={() => setActiveOrders(prev => prev.filter(o => o.id !== delivery.id))}
                        className="text-xs font-semibold bg-amber-500/20 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[delivery.status] || ''}`}>
                        {STATUS_LABEL[delivery.status] || delivery.status}
                      </span>
                      <p className="text-lg font-bold text-green-400">₦{delivery.delivery_fee?.toLocaleString()}</p>
                    </div>

                    {/* Locations */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                          <p className="text-xs text-gray-500">Pickup</p>
                          <p className="text-sm font-medium text-white">{delivery.pickup_location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                        <div>
                          <p className="text-xs text-gray-500">Dropoff</p>
                          <p className="text-sm font-medium text-white">{delivery.dropoff_location}</p>
                        </div>
                      </div>
                    </div>

                    {/* ETA after bought */}
                    {delivery.status !== 'placed' && eta && (
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <p className="text-xs text-amber-400 font-medium">Estimated delivery: {eta}</p>
                      </div>
                    )}

                    {/* Items */}
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

                    {/* Grace period note */}
                    {isBlocked && (
                      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 mb-3">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-xs text-amber-400">Do not buy items until the grace period expires.</p>
                      </div>
                    )}

                    {delivery.special_instructions && (
                      <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5 mb-3">
                        📝 {delivery.special_instructions}
                      </p>
                    )}

                    {/* Action button */}
                    {action && (
                      <button
                        onClick={() => updateStatus(delivery, action.next)}
                        disabled={updating === delivery.id || isBlocked}
                        className={`w-full bg-gradient-to-br ${action.color} text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity`}
                      >
                        {action.requiresCode && <Lock className="w-4 h-4" aria-hidden="true" />}
                        {updating === delivery.id ? 'Updating…' : isBlocked ? `Waiting for grace period (${fmt(gl)})` : action.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isOnline && inProgress.length === 0 && (
        <div className="px-4 mb-4">
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <Bike className="w-7 h-7 text-green-400" aria-hidden="true" />
            </div>
            <p className="text-white font-semibold">Looking for orders…</p>
            <p className="text-gray-500 text-sm mt-1.5">New delivery requests will appear below</p>
          </div>
        </div>
      )}

      {/* Available Orders */}
      {isOnline && available.length > 0 && (
        <div className="px-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Available Orders</p>
          <div className="space-y-3">
            {available.map(order => (
              <div key={order.id} className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">{order.order_type}</span>
                  <span className="text-sm font-bold text-green-400">₦{order.delivery_fee?.toLocaleString()}</span>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-white">{order.pickup_location}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-white">{order.dropoff_location}</p>
                  </div>
                </div>
                {order.order_type === 'purchase' && order.food_cost > 0 && (
                  <p className="text-xs text-gray-500 mb-3">Food cost to reimburse: <span className="text-green-400 font-semibold">₦{order.food_cost.toLocaleString()}</span></p>
                )}
                {order.order_type === 'errand' && order.item_description && (
                  <p className="text-xs text-gray-400 bg-surface-800 rounded-lg px-3 py-2 mb-3">{order.item_description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
                  <Clock className="w-3 h-3" aria-hidden="true" />
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </div>
                <button
                  onClick={() => acceptOrder(order)}
                  className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg shadow-brand-500/20"
                >
                  Accept Order
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
