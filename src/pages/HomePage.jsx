import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { isOrderingOpen, orderingClosedMessage } from '@/lib/restaurantHours';
import { Package, ShoppingBag, Plus, Clock } from 'lucide-react';

function VendorCard({ vendor, onOrder }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="h-24 bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
        <ShoppingBag className="w-10 h-10 text-white" />
      </div>
      <div className="p-3">
        <p className="font-semibold text-gray-900 text-sm">{vendor}</p>
        <button
          onClick={() => onOrder(vendor)}
          className="mt-2 w-full bg-brand-50 text-brand-700 text-xs font-semibold py-1.5 rounded-lg"
        >
          Order from here
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const open = isOrderingOpen();

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('menu_items')
        .select('vendor_name')
        .eq('is_available', true);
      return [...new Set((data || []).map(r => r.vendor_name))];
    },
    staleTime: 5 * 60_000,
  });

  function startOrder(vendor) {
    navigate('/create-order', { state: { vendor } });
  }

  return (
    <div className="p-4 space-y-5">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Hello,</p>
          <h2 className="text-xl font-bold text-gray-900">{profile?.full_name || 'Student'} 👋</h2>
        </div>
        <button
          onClick={() => navigate('/create-order')}
          className="flex items-center gap-1.5 bg-brand-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow"
        >
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* Ordering hours banner */}
      {!open && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <Clock className="inline w-4 h-4 mr-1" />
          {orderingClosedMessage()}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/create-order', { state: { type: 'purchase' } })}
          className="bg-brand-50 border border-brand-100 rounded-2xl p-4 text-left"
        >
          <ShoppingBag className="w-6 h-6 text-brand-600 mb-2" />
          <p className="font-semibold text-gray-900 text-sm">Food Order</p>
          <p className="text-xs text-gray-500 mt-0.5">Order food from campus vendors</p>
        </button>
        <button
          onClick={() => navigate('/create-order', { state: { type: 'errand' } })}
          className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-left"
        >
          <Package className="w-6 h-6 text-blue-600 mb-2" />
          <p className="font-semibold text-gray-900 text-sm">Send Package</p>
          <p className="text-xs text-gray-500 mt-0.5">Send a parcel across campus</p>
        </button>
      </div>

      {/* Vendors */}
      {vendors.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-900 mb-3">Campus Vendors</h3>
          <div className="grid grid-cols-2 gap-3">
            {vendors.map(v => (
              <VendorCard key={v} vendor={v} onOrder={startOrder} />
            ))}
          </div>
        </div>
      )}

      {vendors.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No vendors available right now</p>
        </div>
      )}
    </div>
  );
}
