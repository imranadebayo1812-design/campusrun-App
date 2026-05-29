import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { MOCK_VENDORS } from '@/lib/mockData';
import { isOrderingOpen, orderingClosedMessage } from '@/lib/restaurantHours';
import { ChevronRight, Package, AlertCircle, Wallet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SkeletonVendor } from '@/components/ui/SkeletonCard';

// Metadata-only lookup — emoji/color/zone not stored in DB
const VENDOR_META = Object.fromEntries(MOCK_VENDORS.map(v => [v.name, v]));
const STATUS_LABEL = {
  placed: 'Waiting for courier',
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

const STATUS_DOT = {
  placed: 'bg-yellow-400',
  bought: 'bg-blue-400',
  on_the_way: 'bg-brand-400',
  arrived: 'bg-indigo-400',
  delivered: 'bg-green-400',
  cancelled: 'bg-red-400',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const ACTIVE_STATUSES = ['placed', 'bought', 'on_the_way', 'arrived'];

export default function HomePage() {
  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(() => isOrderingOpen());
  const [activeOrders, setActiveOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Re-evaluate ordering hours every minute so the UI updates at exactly 9:30 PM
  useEffect(() => {
    const id = setInterval(() => setOpen(isOrderingOpen()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    async function loadVendors() {
      const { data: cats } = await supabase
        .from('menu_categories')
        .select('vendor_name')
        .order('vendor_name');

      if (!cats?.length) {
        setVendors(MOCK_VENDORS);
        setVendorsLoading(false);
        return;
      }

      const names = [...new Set(cats.map(c => c.vendor_name))];

      const { data: firstItems } = await supabase
        .from('menu_items')
        .select('vendor_name, name, price')
        .eq('is_available', true)
        .order('vendor_name')
        .order('name');

      const firstByVendor = {};
      for (const item of (firstItems || [])) {
        if (!firstByVendor[item.vendor_name]) firstByVendor[item.vendor_name] = item;
      }

      setVendors(names.map(name => {
        const meta = VENDOR_META[name] || { id: name, zone: 'Campus', category: 'food', color: 'bg-brand-500', emoji: '🏪' };
        const first = firstByVendor[name];
        return { ...meta, name, items: first ? [{ name: first.name, price: first.price }] : meta.items || [] };
      }));
      setVendorsLoading(false);
    }
    loadVendors();
  }, []);

  // Prefetch vendor menus so CreateDeliveryPage opens instantly
  useEffect(() => {
    if (!vendors.length || vendorsLoading) return;
    vendors.forEach(vendor => {
      queryClient.prefetchQuery({
        queryKey: ['menu', vendor.name],
        queryFn: async () => {
          const [{ data: cats }, { data: items }] = await Promise.all([
            supabase.from('menu_categories').select('id, name, display_order')
              .eq('vendor_name', vendor.name).order('display_order'),
            supabase.from('menu_items').select('id, name, price, is_available, category_id')
              .eq('vendor_name', vendor.name).order('name'),
          ]);
          return { cats: cats || [], items: items || [] };
        },
        staleTime: 5 * 60 * 1000,
      });
    });
  }, [vendors, vendorsLoading, queryClient]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('deliveries')
      .select('*')
      .eq('buyer_id', session.user.id)
      .eq('payment_verified', true)
      .in('status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setActiveOrders(data || []));

    // Expire any stale unpicked orders (paid but no courier after 2h)
    supabase.rpc('expire_stale_orders').then(() => {});
  }, [session?.user?.id]);

  const firstName = (profile?.full_name || 'Student').split(' ')[0];
  const balance = profile?.wallet_balance || 0;

  function openVendor(vendor) {
    if (!open) return;
    navigate('/create-order', {
      state: { type: 'purchase', vendor: vendor.zone, vendorId: vendor.id, vendorName: vendor.name },
    });
  }

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-gray-500 text-xs font-medium">{getGreeting()},</p>
          <h2 className="text-xl font-bold text-white">{firstName} 👋</h2>
        </div>
        <button
          onClick={() => navigate('/wallet')}
          className="flex items-center gap-2 bg-surface-900 border border-white/[0.08] rounded-2xl px-3 py-2 active:scale-[0.97] transition-transform"
        >
          <Wallet className="w-4 h-4 text-brand-400" />
          <div className="text-right">
            <p className="text-xs text-gray-500 leading-none">Wallet</p>
            <p className="text-sm font-bold text-white leading-tight">₦{balance.toLocaleString()}</p>
          </div>
        </button>
      </div>

      {/* Ordering hours warning */}
      {!open && (
        <div className="mx-4 mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{orderingClosedMessage()}</span>
        </div>
      )}

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="px-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">In Progress</p>
            <button
              onClick={() => navigate('/orders')}
              className="text-brand-400 text-xs font-semibold flex items-center gap-0.5"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {activeOrders.map(order => (
              <button
                key={order.id}
                onClick={() => navigate(`/track/${order.id}`)}
                className="w-full bg-surface-900 border border-white/[0.08] rounded-2xl p-3.5 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-9 h-9 bg-brand-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{order.pickup_location}</p>
                  <p className="text-gray-500 text-xs">→ {order.dropoff_location}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 justify-end">
                    <div className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status]}`} />
                    <p className={`text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
                      {STATUS_LABEL[order.status]}
                    </p>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All vendors */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Order from Campus</p>
          {open ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              Open · 8 AM – 9:30 PM
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
              Closed
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3" style={!open ? { opacity: 0.45, pointerEvents: 'none', userSelect: 'none' } : undefined}>
          {vendorsLoading
            ? [1,2,3,4,5,6].map(i => <SkeletonVendor key={i} />)
            : vendors.map(vendor => (
            <button
              key={vendor.id}
              onClick={() => openVendor(vendor)}
              className="bg-surface-800 border border-white/[0.06] rounded-2xl p-4 text-left active:scale-[0.97] transition-all hover:border-brand-500/20 hover:shadow-[0_0_16px_rgba(0,209,255,0.08)]"
            >
              <div className={`w-10 h-10 ${vendor.color} rounded-xl flex items-center justify-center mb-3 text-lg`}>
                {vendor.emoji}
              </div>
              <p className="font-semibold text-white text-sm leading-tight">{vendor.name}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{vendor.zone}</p>
              {vendor.items?.[0] && (
                <p className="text-xs text-gray-600 mt-2 truncate">
                  {vendor.items[0].name} · <span className="text-brand-400/70">₦{vendor.items[0].price.toLocaleString()}</span>
                </p>
              )}
            </button>
          ))}

        </div>
        {!open && (
          <p className="text-center text-xs text-gray-600 mt-3">Vendors reopen at midnight</p>
        )}
      </div>

      <div className="h-6" />
    </div>
  );
}
