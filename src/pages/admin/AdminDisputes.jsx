import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle, RefreshCw, CheckCircle, XCircle,
  Clock, Eye, Search, Phone,
} from 'lucide-react';

const STATUS_STYLES = {
  open:       'bg-red-500/15 text-red-400 border-red-500/20',
  reviewing:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  resolved:   'bg-green-500/15 text-green-400 border-green-500/20',
  dismissed:  'bg-gray-500/15 text-gray-400 border-gray-500/20',
};

function DisputeModal({ dispute, onClose, onUpdate }) {
  const [resolution, setResolution] = useState(dispute.resolution || '');
  const [saving, setSaving] = useState(false);

  async function updateStatus(newStatus) {
    setSaving(true);
    await supabase.from('reported_orders').update({
      status: newStatus,
      resolution: resolution.trim() || null,
      resolved_at: ['resolved', 'dismissed'].includes(newStatus) ? new Date().toISOString() : null,
    }).eq('id', dispute.id);
    setSaving(false);
    onUpdate();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <p className="font-bold text-white">Report #{dispute.id.slice(0, 8)}</p>
            <p className="text-xs text-gray-500">{format(new Date(dispute.created_at), 'PPpp')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[dispute.status]}`}>
              {dispute.status}
            </span>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-xl font-bold leading-none ml-2">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Issue type */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Issue Type</p>
            <p className="text-sm font-semibold text-red-400">{dispute.issue_type}</p>
          </div>

          {/* Details */}
          {dispute.details && (
            <div className="bg-white/[0.03] rounded-xl px-4 py-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Details</p>
              <p className="text-sm text-white">{dispute.details}</p>
            </div>
          )}

          {/* Calls made */}
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <p className="text-sm text-gray-400">{dispute.calls_made} call attempt{dispute.calls_made !== 1 ? 's' : ''} made by buyer</p>
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Buyer (Reporter)</p>
              <p className="text-sm text-white font-medium truncate">{dispute.reporter?.full_name || '–'}</p>
              <p className="text-xs text-gray-500 truncate">{dispute.reporter?.email}</p>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Courier</p>
              <p className="text-sm text-white font-medium truncate">{dispute.courier?.full_name || '–'}</p>
              <p className="text-xs text-gray-500 truncate">{dispute.courier?.email}</p>
            </div>
          </div>

          {/* Delivery info */}
          <div className="bg-white/[0.03] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Order</p>
            <p className="text-xs font-mono text-gray-400">{dispute.delivery_id?.slice(0, 16)}…</p>
            {dispute.delivery && (
              <>
                <p className="text-xs text-gray-500 mt-1 truncate">{dispute.delivery.pickup_location} → {dispute.delivery.dropoff_location}</p>
                <p className="text-xs text-gray-500">Status: <span className="text-white">{dispute.delivery.status}</span></p>
              </>
            )}
          </div>

          {/* Earnings freeze notice */}
          {dispute.courier_id && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-400 font-semibold">⚠ Courier earnings frozen</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                {dispute.status === 'dismissed'
                  ? 'Earnings have been unfrozen (report dismissed).'
                  : 'Earnings will unfreeze if you dismiss this report. Resolving in buyer\'s favour keeps them frozen.'}
              </p>
            </div>
          )}

          {/* Resolution notes */}
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1.5">Resolution Notes</label>
            <textarea
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              placeholder="Add notes about your decision…"
              rows={3}
              className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        {dispute.status !== 'resolved' && dispute.status !== 'dismissed' && (
          <div className="px-6 pb-6 space-y-2 shrink-0 border-t border-white/[0.06] pt-4">
            {dispute.status === 'open' && (
              <button
                onClick={() => updateStatus('reviewing')}
                disabled={saving}
                className="w-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/25 disabled:opacity-40 py-3 rounded-xl text-sm font-semibold"
              >
                Mark as Reviewing
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateStatus('dismissed')}
                disabled={saving}
                className="bg-gray-500/15 text-gray-400 border border-gray-500/20 hover:bg-gray-500/25 disabled:opacity-40 py-3 rounded-xl text-sm font-semibold"
              >
                Dismiss Report
              </button>
              <button
                onClick={() => updateStatus('resolved')}
                disabled={saving}
                className="bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 disabled:opacity-40 py-3 rounded-xl text-sm font-semibold"
              >
                Resolve (Buyer Wins)
              </button>
            </div>
            <p className="text-[10px] text-gray-600 text-center">
              Dismiss = courier earnings unfrozen · Resolve = earnings stay frozen
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    setLoading(true);

    // Counts per status
    const { data: all } = await supabase.from('reported_orders').select('status');
    const c = { open: 0, reviewing: 0, resolved: 0, dismissed: 0 };
    (all || []).forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    setCounts(c);

    let q = supabase
      .from('reported_orders')
      .select('*, reporter:profiles!reporter_id(full_name, email), courier:profiles!courier_id(full_name, email), delivery:deliveries(pickup_location, dropoff_location, status)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') q = q.eq('status', filter);

    const { data } = await q;
    setDisputes(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? disputes.filter(d =>
        d.reporter?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.courier?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        d.issue_type?.toLowerCase().includes(search.toLowerCase())
      )
    : disputes;

  const filterTabs = [
    { key: 'open',      label: 'Open',      dot: 'bg-red-400' },
    { key: 'reviewing', label: 'Reviewing', dot: 'bg-yellow-400' },
    { key: 'resolved',  label: 'Resolved',  dot: 'bg-green-400' },
    { key: 'dismissed', label: 'Dismissed', dot: 'bg-gray-400' },
    { key: 'all',       label: 'All' },
  ];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reported Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {counts.open || 0} open · {counts.reviewing || 0} under review
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-white/[0.08] text-gray-400 hover:text-white rounded-xl text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Open',      value: counts.open || 0,      icon: AlertTriangle, color: 'from-red-500 to-pink-500' },
          { label: 'Reviewing', value: counts.reviewing || 0, icon: Clock,         color: 'from-yellow-500 to-orange-500' },
          { label: 'Resolved',  value: counts.resolved || 0,  icon: CheckCircle,   color: 'from-green-500 to-emerald-500' },
          { label: 'Dismissed', value: counts.dismissed || 0, icon: XCircle,       color: 'from-gray-500 to-slate-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface-900 border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color}`} />
            <Icon className="w-4 h-4 text-gray-500 mb-2" />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {filterTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              filter === t.key
                ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                : 'bg-white/[0.03] text-gray-500 border-white/[0.06] hover:border-white/[0.12] hover:text-gray-300'
            }`}
          >
            {t.label}
            {t.key !== 'all' && counts[t.key] > 0 && (
              <span className="bg-white/[0.08] px-1.5 py-0.5 rounded-full text-[10px]">{counts[t.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by buyer, courier or issue…"
          className="w-full bg-surface-900 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Buyer', 'Courier', 'Issue', 'Calls', 'Status', 'Reported', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-white/[0.05] rounded animate-pulse" style={{ width: `${60 + (j * 17) % 80}px` }} />
                    </td>
                  ))}
                </tr>
              )) : filtered.map(d => (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="text-white font-medium whitespace-nowrap">{d.reporter?.full_name || '–'}</p>
                    <p className="text-xs text-gray-500">{d.reporter?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{d.courier?.full_name || '–'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs max-w-[180px] truncate">{d.issue_type}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-mono text-gray-400">{d.calls_made}/3</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_STYLES[d.status]}`}>
                      {d.status}
                    </span>
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

        {!loading && filtered.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No reports found</p>
          </div>
        )}
      </div>

      {selected && (
        <DisputeModal dispute={selected} onClose={() => setSelected(null)} onUpdate={load} />
      )}
    </div>
  );
}
