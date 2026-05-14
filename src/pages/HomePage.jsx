import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { isOrderingOpen, orderingClosedMessage } from '@/lib/restaurantHours';
import { Plus, ChevronRight, Clock, Package, ShoppingBag, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_LABEL = {
  placed: 'Waiting',
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

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { session } = useAuth();
  const open = isOrderingOpen();

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['active-orders-home', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('*')
        .eq('buyer_id', session.user.id)
        .in('status', ['placed', 'bought', 'on_the_way', 'arrived'])
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    refetchInterval: 12_000,
    enabled: !!session,
  });

  const firstName = (profile?.full_name || 'Student').split(' ')[0];

  return (
    <div className="bg-surface-950 min-h-full">
      <div className="px-4 pt-5 pb-4">
        <p className="text-gray-400 text-sm">Hello,</p>
        <h2 className="text-2xl font-bold text-white">{firstName} 👋</h2>
      </div>

      {!open && (
        <div className="mx-4 mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2 text-sm text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {orderingClosedMessage()}
        </div>
      )}

      <div className="mx-4 mb-5">
        <div
          className="rounded-2xl p-5 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)' }}
          onClick={() => navigate('/create-order')}
        >
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/[0.07]" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-1">Quick Action</p>
              <h3 className="text-white font-bold text-xl">New Delivery</h3>
              <p className="text-white/60 text-sm mt-0.5">Order food or send a package</p>
            </div>
            <button className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 border border-white/30">
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => navigate('/create-order', { state: { type: 'purchase' } })}
          className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
        >
          <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center mb-3">
            <ShoppingBag className="w-5 h-5 text-brand-400" />
          </div>
          <p className="font-semibold text-white text-sm">Item Purchase</p>
          <p className="text-xs text-gray-500 mt-0.5">Food & campus vendors</p>
        </button>
        <button
          onClick={() => navigate('/create-order', { state: { type: 'errand' } })}
          className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
        >
          <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-blue-400" />
          </div>
          <p className="font-semibold text-white text-sm">Package / Errand</p>
          <p className="text-xs text-gray-500 mt-0.5">Send items across campus</p>
        </button>
      </div>

      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white text-sm uppercase tracking-wide">Active Orders</h3>
          {activeOrders.length > 0 && (
            <button onClick={() => navigate('/orders')} className="text-brand-400 text-xs font-semibold flex items-center gap-0.5">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-gray-500" />
            </div>
            <p className="text-gray-400 text-sm">No active orders</p>
            <p className="text-gray-500 text-xs mt-1">Your live orders will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeOrders.map(order => (
              <button
                key={order.id}
                onClick={() => navigate(`/track/${order.id}`)}
                className="w-full bg-surface-900 border border-white/[0.08] rounded-2xl p-4 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{order.pickup_location}</p>
                  <p className="text-gray-500 text-xs">→ {order.dropoff_location}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="h-4" />
    </div>
  );
}
