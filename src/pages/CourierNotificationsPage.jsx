import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { Bell, MapPin, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CourierNotificationsPage() {
  const { session } = useAuth();
  const [orders, setOrders] = useState([]);
  const [responding, setResponding] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    async function load() {
      const { data } = await supabase
        .from('deliveries')
        .select('*')
        .is('courier_id', null)
        .eq('status', 'placed')
        .eq('payment_verified', true)
        .order('created_at', { ascending: false });
      setOrders(data || []);
      setLoading(false);
    }
    load();

    const ch = supabase.channel('notif-available')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deliveries' }, payload => {
        const o = payload.new;
        if (!o.courier_id && o.status === 'placed' && o.payment_verified) {
          setOrders(prev => [o, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deliveries' }, payload => {
        const o = payload.new;
        if (o.courier_id || o.status !== 'placed') {
          setOrders(prev => prev.filter(a => a.id !== o.id));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [session?.user?.id]);

  async function accept(order) {
    setResponding(order.id);
    const now = new Date().toISOString();
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { error } = await supabase.from('deliveries').update({
      courier_id: session.user.id,
      status: 'placed',
      accepted_at: now,
      delivery_code: code,
    }).eq('id', order.id).is('courier_id', null);

    if (!error) {
      setOrders(prev => prev.filter(o => o.id !== order.id));
    }
    setResponding(null);
  }

  function decline(orderId) {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  }

  if (loading) {
    return (
      <div className="bg-surface-950 min-h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-surface-950 min-h-full">
      <div className="px-4 pt-5 pb-4 flex items-center gap-2">
        <Bell className="w-5 h-5 text-brand-400" aria-hidden="true" />
        <h1 className="text-xl font-bold text-white">New Orders</h1>
        {orders.length > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {orders.length}
          </span>
        )}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-14 h-14 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-7 h-7 text-gray-600" aria-hidden="true" />
          </div>
          <p className="text-gray-400 font-medium">No pending orders</p>
          <p className="text-gray-600 text-sm mt-1">New orders will appear here instantly</p>
        </div>
      )}

      <div className="px-4 space-y-3">
        {orders.map(order => {
          const earnings = (order.delivery_fee || 0) + (order.food_cost || 0);
          return (
            <div key={order.id} className="bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs uppercase font-bold text-brand-400">{order.order_type} order</span>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-400">+₦{earnings.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">you earn</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-gray-500">Pickup</p>
                      <p className="text-sm font-medium text-white">{order.pickup_location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs text-gray-500">Dropoff</p>
                      <p className="text-sm font-medium text-white">{order.dropoff_location}</p>
                    </div>
                  </div>
                </div>

                {order.order_type === 'purchase' && order.food_cost > 0 && (
                  <p className="text-xs text-gray-500 mb-3">
                    Reimbursed after pickup: <span className="text-green-400 font-semibold">₦{order.food_cost.toLocaleString()}</span>
                  </p>
                )}

                {order.order_type === 'errand' && order.item_description && (
                  <p className="text-xs text-gray-400 bg-surface-800 rounded-lg px-3 py-2 mb-3">{order.item_description}</p>
                )}

                {order.special_instructions && (
                  <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5 mb-3">
                    📝 {order.special_instructions}
                  </p>
                )}

                <p className="text-xs text-gray-600 mb-3">
                  {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => decline(order.id)}
                    disabled={responding === order.id}
                    className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" aria-hidden="true" /> Decline
                  </button>
                  <button
                    onClick={() => accept(order)}
                    disabled={responding === order.id}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {responding === order.id
                      ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      : <CheckCircle className="w-4 h-4" aria-hidden="true" />
                    }
                    Accept
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-4" />
    </div>
  );
}
