import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Search, Filter, RefreshCw, ChevronDown, ChevronUp,
  Package, MapPin, User, Clock, CheckCircle, XCircle,
  ArrowRight, Eye, MoreVertical, UserCheck,
} from 'lucide-react';

const STATUS_COLORS = {
  pending_payment: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  placed:     'bg-blue-500/15 text-blue-400 border-blue-500/20',
  bought:     'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  on_the_way: 'bg-brand-500/15 text-brand-400 border-brand-500/20',
  arrived:    'bg-orange-500/15 text-orange-400 border-orange-500/20',
  delivered:  'bg-green-500/15 text-green-400 border-green-500/20',
  cancelled:  'bg-red-500/15 text-red-400 border-red-500/20',
};
const STATUS_LABELS = {
  pending_payment: 'Awaiting Payment',
  placed: 'Placed', bought: 'Bought', on_the_way: 'On the Way',
  arrived: 'Arrived', delivered: 'Delivered', cancelled: 'Cancelled',
};
const ALL_STATUSES = ['pending_payment', 'placed', 'bought', 'on_the_way', 'arrived', 'delivered', 'cancelled'];

function AssignCourierModal({ delivery, onClose, onAssigned }) {
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);

  useEffect(() => {
    supabase.from('profiles')
      .select('id, full_name, email, avg_rating, total_ratings')
      .eq('is_courier', true)
      .eq('is_blacklisted', false)
      .order('avg_rating', { ascending: false })
      .then(({ data }) => { setCouriers(data || []); setLoading(false); });
  }, []);

  async function assign(courier) {
    setAssigning(courier.id);
    await supabase.from('deliveries').update({
      courier_id: courier.id,
      courier_accepted: true,
      accepted_at: new Date().toISOString(),
    }).eq('id', delivery.id);
    onAssigned();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <p className="font-bold text-white">Assign Courier</p>
            <p className="text-xs text-gray-500 mt-0.5">Order #{delivery.id.slice(0, 8)} · {delivery.pickup_location}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl font-bold">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="h-14 bg-white/[0.04] rounded-xl animate-pulse" />)
          ) : couriers.length === 0 ? (
            <p className="text-center text-gray-500 py-8 text-sm">No active couriers found</p>
          ) : couriers.map(c => (
            <button
              key={c.id}
              onClick={() => assign(c)}
              disabled={!!assigning}
              className="w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl px-4 py-3 text-left disabled:opacity-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-brand-300">{(c.full_name || c.email || '?')[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.full_name || c.email}</p>
                {c.avg_rating ? (
                  <p className="text-xs text-yellow-400">★ {Number(c.avg_rating).toFixed(1)} · {c.total_ratings} ratings</p>
                ) : (
                  <p className="text-xs text-gray-600">No ratings yet</p>
                )}
              </div>
              {assigning === c.id
                ? <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                : <UserCheck className="w-4 h-4 text-gray-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeliveryDetailModal({ delivery, onClose, onStatusChange }) {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(delivery.status);
  const [showAssign, setShowAssign] = useState(false);

  async function saveStatus() {
    if (newStatus === delivery.status) { onClose(); return; }
    setUpdating(true);
    const update = { status: newStatus };
    if (newStatus === 'delivered') update.delivered_at = new Date().toISOString();
    await supabase.from('deliveries').update(update).eq('id', delivery.id);
    setUpdating(false);
    onStatusChange();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <p className="font-bold text-white">Order #{delivery.id.slice(0, 8)}</p>
            <p className="text-xs text-gray-500 mt-0.5">{format(new Date(delivery.created_at), 'PPpp')}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl font-bold leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status badge + picker */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">STATUS</p>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setNewStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    newStatus === s ? STATUS_COLORS[s] : 'bg-white/[0.03] text-gray-500 border-white/[0.06] hover:border-white/[0.12]'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Route */}
          <div className="bg-white/[0.03] rounded-xl p-4 space-y-2.5">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Pickup</p>
                <p className="text-sm text-white">{delivery.pickup_location}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3 h-3 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Dropoff</p>
                <p className="text-sm text-white">{delivery.dropoff_location}</p>
              </div>
            </div>
          </div>

          {/* People */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Buyer</p>
              <p className="text-sm text-white font-medium">{delivery.buyer?.full_name || '–'}</p>
              <p className="text-xs text-gray-500 truncate">{delivery.buyer?.email || ''}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Courier</p>
              <p className="text-sm text-white font-medium">{delivery.courier?.full_name || 'Unassigned'}</p>
              <p className="text-xs text-gray-500 truncate">{delivery.courier?.email || ''}</p>
            </div>
          </div>

          {/* Amounts */}
          <div className="bg-white/[0.03] rounded-xl p-4 space-y-1.5">
            {delivery.food_cost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Food cost</span>
                <span className="text-white">₦{(delivery.food_cost || 0).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="text-white">₦{(delivery.delivery_fee || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Service fee</span>
              <span className="text-white">₦{(delivery.service_fee || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-white/[0.06] pt-2 mt-2">
              <span className="text-white">Total</span>
              <span className="text-brand-400">₦{(delivery.total_amount || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Payment</span>
            <div className="flex items-center gap-2">
              {delivery.payment_verified
                ? <><CheckCircle className="w-4 h-4 text-green-400" /><span className="text-green-400">{delivery.payment_method || 'verified'}</span></>
                : <><XCircle className="w-4 h-4 text-red-400" /><span className="text-red-400">Unverified</span></>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 flex-wrap">
          {!delivery.courier_id && delivery.status === 'placed' && (
            <button
              onClick={() => setShowAssign(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-brand-500/15 border border-brand-500/30 text-brand-400 font-semibold py-3 rounded-xl text-sm hover:bg-brand-500/25"
            >
              <UserCheck className="w-4 h-4" /> Assign Courier
            </button>
          )}
          <button onClick={onClose} className="flex-1 bg-white/[0.05] border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl text-sm">
            Cancel
          </button>
          <button
            onClick={saveStatus}
            disabled={updating || newStatus === delivery.status}
            className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm"
          >
            {updating ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
      {showAssign && (
        <AssignCourierModal
          delivery={delivery}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { onStatusChange(); onClose(); }}
        />
      )}
    </div>
  );
}

export default function AdminDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('deliveries')
      .select('id, status, total_amount, food_cost, delivery_fee, service_fee, created_at, delivered_at, pickup_location, dropoff_location, payment_verified, payment_method, buyer:profiles!buyer_id(full_name, email), courier:profiles!courier_id(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (search.trim()) {
      q = q.or(`pickup_location.ilike.%${search}%,dropoff_location.ilike.%${search}%`);
    }

    const { data, count } = await q;
    setDeliveries(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [statusFilter, search, page]);

  useEffect(() => { load(); }, [load]);

  // realtime
  useEffect(() => {
    const ch = supabase.channel('admin-deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => load())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);

  const statusCounts = {};
  // We rely on DB filter; just show "all" tab with total
  const tabs = [
    { key: 'all', label: 'All' },
    ...ALL_STATUSES.map(s => ({ key: s, label: STATUS_LABELS[s] })),
  ];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Deliveries</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total orders</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-white/[0.08] text-gray-400 hover:text-white rounded-xl text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search by location…"
            className="w-full bg-surface-900 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setStatusFilter(t.key); setPage(0); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              statusFilter === t.key
                ? t.key === 'all' ? 'bg-brand-500/15 text-brand-400 border-brand-500/30' : STATUS_COLORS[t.key]
                : 'bg-white/[0.03] text-gray-500 border-white/[0.06] hover:border-white/[0.12] hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Order ID', 'Buyer', 'Route', 'Courier', 'Status', 'Amount', 'Payment', 'Time', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(8).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {Array(9).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-white/[0.05] rounded animate-pulse" style={{ width: `${50 + (j * 17) % 60}px` }} />
                    </td>
                  ))}
                </tr>
              )) : deliveries.map(d => (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{d.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{d.buyer?.full_name || '–'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px]">
                    <p className="truncate">{d.pickup_location}</p>
                    <p className="truncate text-gray-600">→ {d.dropoff_location}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{d.courier?.full_name || <span className="text-gray-600 italic">Unassigned</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[d.status] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-white whitespace-nowrap">₦{(d.total_amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {d.payment_verified
                      ? <CheckCircle className="w-4 h-4 text-green-400" />
                      : <XCircle className="w-4 h-4 text-gray-600" />}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(d); }}
                      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && deliveries.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No deliveries found</p>
          </div>
        )}

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
            <p className="text-xs text-gray-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-gray-400 disabled:opacity-40 hover:bg-white/[0.08] transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total}
                className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-gray-400 disabled:opacity-40 hover:bg-white/[0.08] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <DeliveryDetailModal
          delivery={selected}
          onClose={() => setSelected(null)}
          onStatusChange={load}
        />
      )}
    </div>
  );
}
