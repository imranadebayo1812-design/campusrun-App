import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Bike, Search, RefreshCw, Star, TrendingUp,
  CheckCircle, XCircle, Package, DollarSign, Eye,
  MapPin,
} from 'lucide-react';

function CourierDetailModal({ courier, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stats');

  useEffect(() => {
    async function load() {
      const [
        { data: profile },
        { data: deliveries },
        { data: earnings },
        { data: withdrawals },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', courier.id).single(),
        supabase.from('deliveries')
          .select('id, status, total_amount, created_at, pickup_location, dropoff_location, delivery_fee')
          .eq('courier_id', courier.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('courier_earnings')
          .select('amount, type, status, created_at')
          .eq('courier_id', courier.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.from('courier_withdrawals')
          .select('amount, status, created_at, bank_name, account_number')
          .eq('courier_id', courier.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);
      setData({ profile, deliveries: deliveries || [], earnings: earnings || [], withdrawals: withdrawals || [] });
      setLoading(false);
    }
    load();
  }, [courier.id]);

  const totalEarned = data?.earnings.reduce((s, e) => s + (e.amount || 0), 0) || 0;
  const completedDeliveries = data?.deliveries.filter(d => d.status === 'delivered').length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-indigo-500/30 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-brand-300">
              {(courier.full_name || courier.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white">{courier.full_name || 'No name'}</p>
            <p className="text-xs text-gray-500">{courier.email}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 bg-brand-500/15 text-brand-400 border border-brand-500/20 rounded-full shrink-0">Courier</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl font-bold leading-none ml-2">×</button>
        </div>

        <div className="flex border-b border-white/[0.06] shrink-0">
          {['stats', 'deliveries', 'earnings'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-medium capitalize transition-colors ${
                tab === t ? 'text-brand-400 border-b-2 border-brand-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />)}
            </div>
          ) : tab === 'stats' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Deliveries', value: data.deliveries.length, sub: `${completedDeliveries} completed`, icon: Package, color: 'text-blue-400' },
                  { label: 'Total Earned', value: `₦${totalEarned.toLocaleString()}`, sub: 'All time', icon: TrendingUp, color: 'text-green-400' },
                  { label: 'Wallet Balance', value: `₦${(data.profile?.wallet_balance || 0).toLocaleString()}`, sub: 'Current', icon: DollarSign, color: 'text-yellow-400' },
                  { label: 'Active Since', value: format(new Date(data.profile?.created_at || Date.now()), 'MMM yyyy'), sub: formatDistanceToNow(new Date(data.profile?.created_at || Date.now())), icon: Star, color: 'text-brand-400' },
                ].map(({ label, value, sub, icon: Icon, color }) => (
                  <div key={label} className="bg-white/[0.03] rounded-xl p-4">
                    <Icon className={`w-4 h-4 ${color} mb-2`} />
                    <p className="text-lg font-bold text-white">{value}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                    <p className="text-[10px] text-gray-600">{sub}</p>
                  </div>
                ))}
              </div>
              {data.withdrawals.length > 0 && (
                <div className="bg-white/[0.03] rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-400 mb-3">Recent Withdrawals</p>
                  {data.withdrawals.slice(0, 3).map((w, i) => (
                    <div key={i} className="flex justify-between items-center py-1.5">
                      <div>
                        <p className="text-xs text-white">{w.bank_name} ····{w.account_number?.slice(-4)}</p>
                        <p className="text-[10px] text-gray-600">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-white">₦{(w.amount || 0).toLocaleString()}</p>
                        <span className={`text-[10px] ${w.status === 'completed' ? 'text-green-400' : w.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {w.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : tab === 'deliveries' ? (
            <div className="space-y-2">
              {data.deliveries.length === 0 ? (
                <p className="text-center text-gray-600 py-6 text-sm">No deliveries yet</p>
              ) : data.deliveries.map(d => (
                <div key={d.id} className="bg-white/[0.03] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-gray-400">{d.id.slice(0, 8)}</span>
                    <span className={`text-xs font-medium ${d.status === 'delivered' ? 'text-green-400' : d.status === 'cancelled' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {d.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{d.pickup_location} → {d.dropoff_location}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-600">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                    <span className="text-xs font-medium text-brand-400">+₦{(d.delivery_fee || 0).toLocaleString()} fee</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {data.earnings.length === 0 ? (
                <p className="text-center text-gray-600 py-6 text-sm">No earnings yet</p>
              ) : data.earnings.map((e, i) => (
                <div key={i} className="bg-white/[0.03] rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-white capitalize">{e.type?.replace('_', ' ')}</p>
                    <p className="text-[10px] text-gray-600">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">+₦{(e.amount || 0).toLocaleString()}</p>
                    <span className={`text-[10px] ${e.status === 'available' ? 'text-green-400' : 'text-gray-500'}`}>{e.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminCouriers() {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [stats, setStats] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('profiles')
      .select('id, full_name, email, is_blacklisted, created_at, wallet_balance')
      .eq('is_courier', true)
      .order('created_at', { ascending: false });

    if (search.trim()) q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data } = await q;
    const courierList = data || [];

    // Fetch active delivery counts per courier
    if (courierList.length > 0) {
      const ids = courierList.map(c => c.id);
      const { data: activeDels } = await supabase
        .from('deliveries')
        .select('courier_id')
        .in('courier_id', ids)
        .not('status', 'in', '("delivered","cancelled")');

      const { data: totalDels } = await supabase
        .from('deliveries')
        .select('courier_id')
        .in('courier_id', ids)
        .eq('status', 'delivered');

      const activeMap = {};
      const totalMap = {};
      (activeDels || []).forEach(d => { activeMap[d.courier_id] = (activeMap[d.courier_id] || 0) + 1; });
      (totalDels || []).forEach(d => { totalMap[d.courier_id] = (totalMap[d.courier_id] || 0) + 1; });
      setStats({ activeMap, totalMap });
    }

    setCouriers(courierList);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Couriers</h1>
          <p className="text-sm text-gray-500 mt-0.5">{couriers.length} registered runners</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-white/[0.08] text-gray-400 hover:text-white rounded-xl text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Couriers', value: couriers.length, color: 'from-brand-500 to-indigo-500' },
          { label: 'Currently Active', value: Object.values(stats.activeMap || {}).filter(n => n > 0).length, color: 'from-green-500 to-emerald-500' },
          { label: 'Total Deliveries', value: Object.values(stats.totalMap || {}).reduce((s, n) => s + n, 0), color: 'from-yellow-500 to-orange-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface-900 border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color}`} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search couriers…"
          className="w-full bg-surface-900 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/[0.06]" />
                <div className="space-y-2 flex-1">
                  <div className="h-3.5 bg-white/[0.06] rounded w-24" />
                  <div className="h-2.5 bg-white/[0.04] rounded w-32" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array(3).fill(0).map((_, j) => <div key={j} className="h-10 bg-white/[0.04] rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : couriers.length === 0 ? (
        <div className="text-center py-16">
          <Bike className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No couriers found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {couriers.map(c => {
            const active = stats.activeMap?.[c.id] || 0;
            const completed = stats.totalMap?.[c.id] || 0;
            return (
              <div
                key={c.id}
                onClick={() => setSelected(c)}
                className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.12] cursor-pointer transition-all hover:bg-white/[0.02] group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-indigo-500/30 flex items-center justify-center shrink-0 relative">
                    <span className="text-base font-bold text-brand-300">
                      {(c.full_name || c.email || '?')[0].toUpperCase()}
                    </span>
                    {active > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#111827]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{c.full_name || 'No name'}</p>
                    <p className="text-xs text-gray-500 truncate">{c.email}</p>
                  </div>
                  {c.is_blacklisted && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-full border border-red-500/20 shrink-0">Banned</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                    <p className="text-base font-bold text-white">{active}</p>
                    <p className="text-[10px] text-gray-500">Active</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                    <p className="text-base font-bold text-white">{completed}</p>
                    <p className="text-[10px] text-gray-500">Done</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                    <p className="text-sm font-bold text-green-400">₦{(c.wallet_balance || 0) >= 1000 ? `${Math.floor(c.wallet_balance / 1000)}k` : (c.wallet_balance || 0)}</p>
                    <p className="text-[10px] text-gray-500">Wallet</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.04]">
                  <p className="text-[10px] text-gray-600">
                    Joined {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </p>
                  <Eye className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <CourierDetailModal courier={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
