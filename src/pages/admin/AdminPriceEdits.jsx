import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow, format } from 'date-fns';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react';

const RESPONSE_STYLES = {
  accepted: { label: 'Accepted', cls: 'bg-green-500/15 text-green-400 border-green-500/20', icon: CheckCircle },
  rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/20', icon: XCircle },
  pending:  { label: 'Pending',  cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: Clock },
};

export default function AdminPriceEdits() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [flagged, setFlagged] = useState([]);

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from('price_edit_logs')
      .select(`
        id, item_name, original_price, new_price, created_at,
        delivery_id,
        courier:profiles!price_edit_logs_courier_id_fkey(id, full_name, email),
        delivery:deliveries!price_edit_logs_delivery_id_fkey(
          price_edit_buyer_response,
          buyer:profiles!deliveries_buyer_id_fkey(full_name, email)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data) {
      // Fallback: join manually if FK names differ
      const { data: rawLogs } = await supabase
        .from('price_edit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (rawLogs && rawLogs.length > 0) {
        const deliveryIds = [...new Set(rawLogs.map(l => l.delivery_id))];
        const courierIds  = [...new Set(rawLogs.map(l => l.courier_id))];

        const [{ data: deliveries }, { data: couriers }] = await Promise.all([
          supabase.from('deliveries')
            .select('id, price_edit_buyer_response, buyer_id')
            .in('id', deliveryIds),
          supabase.from('profiles')
            .select('id, full_name, email')
            .in('id', courierIds),
        ]);

        const buyerIds = [...new Set((deliveries || []).map(d => d.buyer_id).filter(Boolean))];
        const { data: buyers } = await supabase.from('profiles')
          .select('id, full_name, email').in('id', buyerIds);

        const delivMap  = Object.fromEntries((deliveries || []).map(d => [d.id, d]));
        const courMap   = Object.fromEntries((couriers  || []).map(c => [c.id, c]));
        const buyerMap  = Object.fromEntries((buyers    || []).map(b => [b.id, b]));

        const merged = rawLogs.map(l => ({
          ...l,
          courier:  courMap[l.courier_id]  || null,
          delivery: delivMap[l.delivery_id]
            ? { ...delivMap[l.delivery_id], buyer: buyerMap[delivMap[l.delivery_id].buyer_id] || null }
            : null,
        }));
        setLogs(merged);
        computeFlagged(merged);
      }
      setLoading(false);
      return;
    }

    setLogs(data || []);
    computeFlagged(data || []);
    setLoading(false);
  }

  function computeFlagged(data) {
    const counts = {};
    data.forEach(l => {
      const id = l.courier?.id || l.courier_id;
      if (!id) return;
      counts[id] = counts[id] || { count: 0, name: l.courier?.full_name || l.courier?.email || id };
      counts[id].count++;
    });
    const threshold = 3;
    setFlagged(
      Object.entries(counts)
        .filter(([, v]) => v.count >= threshold)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([id, v]) => ({ id, ...v }))
    );
  }

  useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    if (filter === 'all') return true;
    const resp = l.delivery?.price_edit_buyer_response || 'pending';
    return resp === filter;
  });

  const stats = {
    total:    logs.length,
    pending:  logs.filter(l => !l.delivery?.price_edit_buyer_response).length,
    accepted: logs.filter(l => l.delivery?.price_edit_buyer_response === 'accepted').length,
    rejected: logs.filter(l => l.delivery?.price_edit_buyer_response === 'rejected').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Price Edit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitor courier price changes for fraud prevention</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] rounded-xl text-sm text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Edits',  value: stats.total,    color: 'text-white' },
          { label: 'Pending',      value: stats.pending,  color: 'text-amber-400' },
          { label: 'Accepted',     value: stats.accepted, color: 'text-green-400' },
          { label: 'Rejected',     value: stats.rejected, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Flagged couriers */}
      {flagged.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Flagged Couriers (3+ edits)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {flagged.map(c => (
              <div key={c.id} className="flex items-center gap-2 bg-red-500/15 border border-red-500/20 rounded-xl px-3 py-1.5">
                <span className="text-sm text-white font-medium">{c.name}</span>
                <span className="text-xs text-red-400 font-bold">{c.count} edits</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-1 w-fit">
        {['all', 'pending', 'accepted', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === f
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No price edits found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const diff = (log.new_price || 0) - (log.original_price || 0);
            const pct  = log.original_price ? Math.round((diff / log.original_price) * 100) : 0;
            const resp = log.delivery?.price_edit_buyer_response || 'pending';
            const style = RESPONSE_STYLES[resp] || RESPONSE_STYLES.pending;
            const Icon  = style.icon;
            const isSuspicious = pct > 50;

            return (
              <div
                key={log.id}
                className={`bg-white/[0.03] border rounded-2xl p-4 space-y-3 ${
                  isSuspicious ? 'border-red-500/30' : 'border-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white truncate">{log.item_name}</p>
                      {isSuspicious && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="w-2.5 h-2.5" /> +{pct}% suspicious
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Order #{(log.delivery_id || '').slice(0, 8)} ·{' '}
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  <span className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${style.cls}`}>
                    <Icon className="w-3 h-3" />
                    {style.label}
                  </span>
                </div>

                {/* Price change */}
                <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-2">
                  <span className="text-sm text-gray-400 line-through">₦{Math.round(log.original_price || 0).toLocaleString()}</span>
                  <span className="text-gray-600">→</span>
                  <span className="text-sm font-bold text-white">₦{Math.round(log.new_price || 0).toLocaleString()}</span>
                  <span className={`ml-auto text-xs font-bold ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {diff > 0 ? '+' : ''}₦{Math.round(diff).toLocaleString()}
                  </span>
                </div>

                {/* People */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/[0.02] rounded-xl px-3 py-2">
                    <p className="text-gray-600 uppercase tracking-wider text-[10px] mb-0.5">Courier</p>
                    <p className="text-white font-medium truncate">
                      {log.courier?.full_name || log.courier?.email || '–'}
                    </p>
                  </div>
                  <div className="bg-white/[0.02] rounded-xl px-3 py-2">
                    <p className="text-gray-600 uppercase tracking-wider text-[10px] mb-0.5">Buyer</p>
                    <p className="text-white font-medium truncate">
                      {log.delivery?.buyer?.full_name || log.delivery?.buyer?.email || '–'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
