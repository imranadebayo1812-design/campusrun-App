import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Bike, MapPin, Package, Lock, MessageCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DeliveryCodeVerify from '@/components/courier/DeliveryCodeVerify';
import ChatModal from '@/components/buyer/ChatModal';

const STATUS_ACTIONS = {
  placed:     { label: 'Mark as Bought', next: 'bought', color: 'bg-blue-600' },
  bought:     { label: 'Mark On The Way', next: 'on_the_way', color: 'bg-brand-600' },
  on_the_way: { label: 'Mark as Arrived', next: 'arrived', color: 'bg-indigo-600' },
  arrived:    { label: 'Verify Delivery Code', next: 'delivered', color: 'bg-green-600', requiresCode: true },
};

const STATUS_COLOR = {
  placed:     'text-yellow-400 bg-yellow-400/10',
  bought:     'text-blue-400 bg-blue-400/10',
  on_the_way: 'text-brand-400 bg-brand-400/10',
  arrived:    'text-indigo-400 bg-indigo-400/10',
};

export default function CourierDashboard() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [verifyDelivery, setVerifyDelivery] = useState(null);
  const [chatDeliveryId, setChatDeliveryId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [isOnline, setIsOnline] = useState(true);

  const { data: activeOrders = [], isLoading } = useQuery({
    queryKey: ['courier-active', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('*')
        .eq('courier_id', session.user.id)
        .in('status', ['placed', 'bought', 'on_the_way', 'arrived'])
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: activeOrders.length > 0 ? 10_000 : false,
    enabled: !!session,
  });

  const { data: stats } = useQuery({
    queryKey: ['courier-stats', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('delivery_fee, tip, delivered_at')
        .eq('courier_id', session.user.id)
        .eq('status', 'delivered');
      const all = data || [];
      const total = all.reduce((s, d) => s + (d.delivery_fee || 0), 0);
      const tips = all.reduce((s, d) => s + (d.tip || 0), 0);
      const days = [...new Set(all.map(d => d.delivered_at?.slice(0, 10)))].length || 1;
      return {
        totalDeliveries: all.length,
        totalEarned: total,
        dailyAvg: Math.round(total / days),
        tipsReceived: tips,
      };
    },
    enabled: !!session,
  });

  async function updateStatus(delivery, nextStatus) {
    if (STATUS_ACTIONS[delivery.status]?.requiresCode) {
      setVerifyDelivery(delivery);
      return;
    }
    setUpdating(delivery.id);
    await supabase
      .from('deliveries')
      .update({ status: nextStatus })
      .eq('id', delivery.id);
    queryClient.invalidateQueries(['courier-active', session.user.id]);
    setUpdating(null);
  }

  if (!profile?.is_courier) {
    return (
      <div className="bg-surface-950 min-h-full p-4 text-center py-20">
        <div className="w-16 h-16 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <Bike className="w-8 h-8 text-gray-600" />
        </div>
        <p className="font-semibold text-white text-lg">Courier mode not active</p>
        <p className="text-sm text-gray-500 mt-1">Enable courier mode in your profile</p>
        <button
          onClick={() => navigate('/profile')}
          className="mt-5 bg-brand-500 text-white px-6 py-3 rounded-xl text-sm font-semibold"
        >
          Go to Profile
        </button>
      </div>
    );
  }

  const openCount = activeOrders.filter(o => o.status === 'placed').length;
  const inProgressCount = activeOrders.filter(o => ['bought', 'on_the_way'].includes(o.status)).length;
  const arrivedCount = activeOrders.filter(o => o.status === 'arrived').length;

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Deliveries</h1>
          <p className="text-sm text-gray-500">{activeOrders.length} active</p>
        </div>
        {/* Online/Offline toggle */}
        <button
          onClick={() => setIsOnline(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            isOnline
              ? 'bg-green-500/15 text-green-400 border border-green-500/30'
              : 'bg-surface-900 text-gray-500 border border-white/[0.08]'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Stats grid */}
      {stats && (
        <div className="px-4 mb-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Deliveries', value: stats.totalDeliveries, icon: Package, color: 'text-brand-400', bg: 'bg-brand-500/10' },
              { label: 'Total Earned', value: `₦${stats.totalEarned.toLocaleString()}`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
              { label: 'Daily Avg', value: `₦${stats.dailyAvg.toLocaleString()}`, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Tips Received', value: `₦${stats.tipsReceived.toLocaleString()}`, icon: CheckCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-2`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="text-white font-bold text-lg mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order count row */}
      <div className="px-4 mb-5">
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-3 grid grid-cols-3 divide-x divide-white/[0.08]">
          {[
            { label: 'Open', count: openCount, color: 'text-yellow-400' },
            { label: 'Active', count: inProgressCount, color: 'text-brand-400' },
            { label: 'Done', count: arrivedCount, color: 'text-green-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="text-center px-2">
              <p className={`text-2xl font-bold ${color}`}>{count}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active orders list */}
      <div className="px-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-brand-800 border-t-brand-500 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && activeOrders.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bike className="w-7 h-7 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No active deliveries</p>
            <p className="text-gray-600 text-sm mt-1">Check alerts for new orders</p>
          </div>
        )}

        {activeOrders.map(delivery => {
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

                <div className="flex gap-2">
                  <button
                    onClick={() => setChatDeliveryId(delivery.id)}
                    className="w-11 h-11 bg-surface-800 border border-white/[0.08] rounded-xl flex items-center justify-center shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 text-gray-400" />
                  </button>
                  {action && (
                    <button
                      onClick={() => updateStatus(delivery, action.next)}
                      disabled={updating === delivery.id}
                      className={`flex-1 ${action.color} text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50`}
                    >
                      {action.requiresCode && <Lock className="w-4 h-4" />}
                      {updating === delivery.id ? 'Updating…' : action.label}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-4" />

      {verifyDelivery && (
        <DeliveryCodeVerify
          delivery={verifyDelivery}
          onSuccess={() => {
            setVerifyDelivery(null);
            queryClient.invalidateQueries(['courier-active', session.user.id]);
          }}
          onClose={() => setVerifyDelivery(null)}
        />
      )}

      {chatDeliveryId && (
        <ChatModal deliveryId={chatDeliveryId} onClose={() => setChatDeliveryId(null)} />
      )}
    </div>
  );
}
