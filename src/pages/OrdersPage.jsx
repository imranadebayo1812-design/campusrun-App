import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { Package, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLOR = {
  placed: 'bg-yellow-100 text-yellow-700',
  bought: 'bg-blue-100 text-blue-700',
  on_the_way: 'bg-purple-100 text-purple-700',
  arrived: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('*')
        .eq('buyer_id', session.user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 12_000,
  });

  const active = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const history = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" /></div>;
  }

  function OrderCard({ order }) {
    const isActive = !['delivered', 'cancelled'].includes(order.status);
    return (
      <button
        onClick={() => navigate(`/track/${order.id}`)}
        className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-left flex items-center gap-3 shadow-sm active:scale-[0.98] transition-transform"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-brand-100' : 'bg-gray-100'}`}>
          <Package className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-900 truncate">{order.pickup_location}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[order.status]}`}>
              {order.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-xs text-gray-500">→ {order.dropoff_location}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-brand-600">₦{order.total_amount?.toLocaleString()}</p>
          <ChevronRight className="w-4 h-4 text-gray-400 mt-1 ml-auto" />
        </div>
      </button>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">My Orders</h1>

      {active.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-500" /> Active ({active.length})
          </p>
          <div className="space-y-2">
            {active.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-3">History</p>
          <div className="space-y-2">
            {history.map(o => <OrderCard key={o.id} order={o} />)}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm mt-1">Place your first delivery order</p>
          <button
            onClick={() => navigate('/create-order')}
            className="mt-4 bg-brand-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold"
          >
            Create Order
          </button>
        </div>
      )}
    </div>
  );
}
