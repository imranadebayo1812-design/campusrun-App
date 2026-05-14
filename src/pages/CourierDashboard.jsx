import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Bike, MapPin, Package, CheckCircle, Lock, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DeliveryCodeVerify from '@/components/courier/DeliveryCodeVerify';
import ChatModal from '@/components/buyer/ChatModal';

const STATUS_ACTIONS = {
  placed:     { label: 'Mark as Bought', next: 'bought', color: 'bg-blue-600' },
  bought:     { label: 'Mark On The Way', next: 'on_the_way', color: 'bg-purple-600' },
  on_the_way: { label: 'Mark as Arrived', next: 'arrived', color: 'bg-indigo-600' },
  arrived:    { label: 'Verify Delivery Code', next: 'delivered', color: 'bg-green-600', requiresCode: true },
};

export default function CourierDashboard() {
  const { session, profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [verifyDelivery, setVerifyDelivery] = useState(null);
  const [chatDeliveryId, setChatDeliveryId] = useState(null);
  const [updating, setUpdating] = useState(null);

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
      <div className="p-4 text-center py-16 text-gray-500">
        <Bike className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">Courier mode not active</p>
        <p className="text-sm mt-1">Enable courier mode in your profile</p>
        <button onClick={() => navigate('/profile')} className="mt-4 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">Go to Profile</button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Active Deliveries</h1>
        <span className="text-sm text-gray-500">{activeOrders.length} active</span>
      </div>

      {activeOrders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Bike className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No active deliveries</p>
          <p className="text-sm mt-1">Check notifications for new orders</p>
        </div>
      )}

      <div className="space-y-3">
        {activeOrders.map(delivery => {
          const action = STATUS_ACTIONS[delivery.status];
          return (
            <div key={delivery.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 capitalize">
                      {delivery.status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs text-gray-400 mt-1 uppercase font-mono">{delivery.order_type}</p>
                  </div>
                  <p className="text-lg font-bold text-brand-600">₦{delivery.delivery_fee?.toLocaleString()}</p>
                </div>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Pickup</p>
                      <p className="text-sm font-medium text-gray-900">{delivery.pickup_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Dropoff</p>
                      <p className="text-sm font-medium text-gray-900">{delivery.dropoff_location}</p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                {delivery.order_type === 'purchase' && delivery.items?.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-2.5 mb-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Items to buy:</p>
                    {delivery.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-700">
                        <span>{item.qty}× {item.name}</span>
                        <span>₦{(parseFloat(item.price) * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-1.5 pt-1 flex justify-between text-xs font-semibold">
                      <span>Food cost (reimburse)</span>
                      <span className="text-green-700">+₦{delivery.food_cost?.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {delivery.special_instructions && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-3">
                    📝 {delivery.special_instructions}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setChatDeliveryId(delivery.id)}
                    className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center shrink-0"
                  >
                    <MessageCircle className="w-4 h-4 text-gray-600" />
                  </button>
                  {action && (
                    <button
                      onClick={() => updateStatus(delivery, action.next)}
                      disabled={updating === delivery.id}
                      className={`flex-1 ${action.color} text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60`}
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
