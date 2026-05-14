import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Bell, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CourierNotificationsPage() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['courier-notifications', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase.from('courier_notifications').select('*, deliveries(*)').eq('courier_id', session.user.id).eq('responded', false).order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 12_000,
  });

  async function respond(notification, response) {
    const { deliveries: delivery } = notification;
    if (response === 'accepted') {
      const gracePeriodEnds = new Date(Date.now() + 2 * 60 * 1000).toISOString();
      await supabase.from('deliveries').update({ courier_id: session.user.id, courier_accepted: true, courier_accepted_at: new Date().toISOString(), grace_period_ends_at: gracePeriodEnds, courier_name: '' }).eq('id', delivery.id).eq('courier_accepted', false);
    }
    await supabase.from('courier_notifications').update({ responded: true, response }).eq('id', notification.id);
    queryClient.invalidateQueries(['courier-notifications', session.user.id]);
    queryClient.invalidateQueries(['courier-active', session.user.id]);
  }

  return (
    <div className="bg-surface-950 min-h-full">
      <div className="px-4 pt-5 pb-4 flex items-center gap-2">
        <Bell className="w-5 h-5 text-brand-400" />
        <h1 className="text-xl font-bold text-white">New Orders</h1>
        {notifications.length > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{notifications.length}</span>}
      </div>
      {isLoading && <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-brand-800 border-t-brand-500 rounded-full animate-spin" /></div>}
      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-14 h-14 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-4"><Bell className="w-7 h-7 text-gray-600" /></div>
          <p className="text-gray-400 font-medium">No pending orders</p>
          <p className="text-gray-600 text-sm mt-1">New orders will appear here</p>
        </div>
      )}
      <div className="px-4 space-y-3">
        {notifications.map(notif => {
          const d = notif.deliveries;
          if (!d) return null;
          const earnings = (d.delivery_fee || 0) + (d.food_cost || 0);
          return (
            <div key={notif.id} className="bg-surface-900 border border-white/[0.08] rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold text-brand-400">{d.order_type} order</span>
                    {notif.gate_only && <span className="text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">Gate only</span>}
                  </div>
                  <div className="text-right"><p className="text-lg font-bold text-green-400">+₦{earnings.toLocaleString()}</p><p className="text-xs text-gray-500">you earn</p></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" /><div><p className="text-xs text-gray-500">Pickup</p><p className="text-sm font-medium text-white">{d.pickup_location}</p></div></div>
                  <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /><div><p className="text-xs text-gray-500">Dropoff</p><p className="text-sm font-medium text-white">{d.dropoff_location}</p></div></div>
                </div>
                {d.order_type === 'purchase' && d.items?.length > 0 && (
                  <div className="bg-surface-800 border border-white/[0.06] rounded-xl p-3 mb-3">
                    {d.items.map((item, i) => <p key={i} className="text-xs text-gray-300">{item.qty}× {item.name} — ₦{item.price}</p>)}
                    <p className="text-xs font-semibold text-green-400 mt-1.5">You'll be reimbursed ₦{d.food_cost?.toLocaleString()}</p>
                  </div>
                )}
                {d.special_instructions && <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-xl p-2.5 mb-3">📝 {d.special_instructions}</p>}
                <p className="text-xs text-gray-600 mb-3">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}</p>
                <div className="flex gap-2">
                  <button onClick={() => respond(notif, 'rejected')} className="flex-1 bg-red-500/10 border border-red-500/30 text-red-400 font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4" /> Decline</button>
                  <button onClick={() => respond(notif, 'accepted')} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1.5"><CheckCircle className="w-4 h-4" /> Accept</button>
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
