import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Banknote, RefreshCw, CheckCircle, XCircle,
  Clock, AlertCircle, Search, Eye,
} from 'lucide-react';

const STATUS_STYLES = {
  pending:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  approved:  'bg-blue-500/15 text-blue-400 border-blue-500/20',
  completed: 'bg-green-500/15 text-green-400 border-green-500/20',
  failed:    'bg-red-500/15 text-red-400 border-red-500/20',
  rejected:  'bg-red-500/15 text-red-400 border-red-500/20',
};

function WithdrawalModal({ withdrawal, onClose, onUpdate }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);

  async function approve() {
    setActionLoading(true);
    await supabase
      .from('courier_withdrawals')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', withdrawal.id);
    setActionLoading(false);
    onUpdate();
    onClose();
  }

  async function reject() {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    await supabase
      .from('courier_withdrawals')
      .update({ status: 'rejected', failure_reason: rejectReason, completed_at: new Date().toISOString() })
      .eq('id', withdrawal.id);
    // Refund wallet
    const { data: courier } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', withdrawal.courier_id)
      .single();
    if (courier) {
      await supabase.from('profiles')
        .update({ wallet_balance: (courier.wallet_balance || 0) + withdrawal.amount })
        .eq('id', withdrawal.courier_id);
    }
    setActionLoading(false);
    onUpdate();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="bg-[#0d0d1f] border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div>
            <p className="font-bold text-white">Withdrawal #{withdrawal.id.slice(0, 8)}</p>
            <p className="text-xs text-gray-500">{format(new Date(withdrawal.created_at), 'PPpp')}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl font-bold leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Amount */}
          <div className="bg-gradient-to-br from-brand-500/10 to-indigo-500/10 border border-brand-500/20 rounded-2xl p-4 text-center">
            <p className="text-3xl font-bold text-white">₦{(withdrawal.amount || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Withdrawal Amount</p>
          </div>

          {/* Bank details */}
          <div className="bg-white/[0.03] rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Bank Details</p>
            {[
              { label: 'Bank', value: withdrawal.bank_name || '–' },
              { label: 'Account Number', value: withdrawal.account_number || '–' },
              { label: 'Account Name', value: withdrawal.account_name || '–' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-white font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Courier */}
          <div className="bg-white/[0.03] rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Courier</p>
            <p className="text-sm text-white font-medium">{withdrawal.courier?.full_name || '–'}</p>
            <p className="text-xs text-gray-500">{withdrawal.courier?.email || ''}</p>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Current Status</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[withdrawal.status] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
              {withdrawal.status}
            </span>
          </div>

          {withdrawal.failure_reason && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-red-400">Reason: {withdrawal.failure_reason}</p>
            </div>
          )}
        </div>

        {withdrawal.status === 'pending' && (
          <div className="px-6 pb-6 space-y-3">
            {showReject ? (
              <div className="space-y-3">
                <input
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection (required)"
                  className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowReject(false)}
                    className="flex-1 bg-white/[0.05] border border-white/[0.08] text-gray-400 py-3 rounded-xl text-sm font-medium"
                  >
                    Back
                  </button>
                  <button
                    onClick={reject}
                    disabled={actionLoading || !rejectReason.trim()}
                    className="flex-1 bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500/25 disabled:opacity-40 py-3 rounded-xl text-sm font-semibold"
                  >
                    {actionLoading ? 'Processing…' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowReject(true)}
                  className="flex-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 py-3 rounded-xl text-sm font-semibold"
                >
                  Reject
                </button>
                <button
                  onClick={approve}
                  disabled={actionLoading}
                  className="flex-1 bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 disabled:opacity-40 py-3 rounded-xl text-sm font-semibold"
                >
                  {actionLoading ? 'Processing…' : 'Approve'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [totals, setTotals] = useState({});

  const load = useCallback(async () => {
    setLoading(true);

    // Summary counts
    const { data: summary } = await supabase
      .from('courier_withdrawals')
      .select('status, amount');
    const t = { pending: 0, approved: 0, completed: 0, failed: 0, rejected: 0 };
    const amounts = { pending: 0, completed: 0 };
    (summary || []).forEach(w => {
      t[w.status] = (t[w.status] || 0) + 1;
      if (w.status === 'pending') amounts.pending += (w.amount || 0);
      if (w.status === 'completed') amounts.completed += (w.amount || 0);
    });
    setTotals({ counts: t, amounts });

    let q = supabase
      .from('courier_withdrawals')
      .select('id, amount, status, bank_name, account_number, account_name, courier_id, created_at, approved_at, completed_at, failure_reason, paystack_reference, courier:profiles!courier_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (filter !== 'all') q = q.eq('status', filter);

    const { data } = await q;
    setWithdrawals(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filterTabs = [
    { key: 'pending', label: 'Pending', dot: 'bg-yellow-400' },
    { key: 'approved', label: 'Approved', dot: 'bg-blue-400' },
    { key: 'completed', label: 'Completed', dot: 'bg-green-400' },
    { key: 'failed', label: 'Failed', dot: 'bg-red-400' },
    { key: 'all', label: 'All' },
  ];

  const filtered = search.trim()
    ? withdrawals.filter(w =>
        w.courier?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        w.courier?.email?.toLowerCase().includes(search.toLowerCase()) ||
        w.bank_name?.toLowerCase().includes(search.toLowerCase())
      )
    : withdrawals;

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Withdrawals</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totals.counts?.pending || 0} pending · ₦{(totals.amounts?.pending || 0).toLocaleString()} awaiting
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
          { label: 'Pending', value: totals.counts?.pending || 0, sub: `₦${(totals.amounts?.pending || 0).toLocaleString()}`, color: 'bg-gradient-to-r from-yellow-500 to-orange-500', icon: Clock },
          { label: 'Completed', value: totals.counts?.completed || 0, sub: `₦${(totals.amounts?.completed || 0).toLocaleString()}`, color: 'bg-gradient-to-r from-green-500 to-emerald-500', icon: CheckCircle },
          { label: 'Approved', value: totals.counts?.approved || 0, sub: 'Awaiting payout', color: 'bg-gradient-to-r from-blue-500 to-cyan-500', icon: AlertCircle },
          { label: 'Failed/Rejected', value: (totals.counts?.failed || 0) + (totals.counts?.rejected || 0), sub: 'Refunded', color: 'bg-gradient-to-r from-red-500 to-pink-500', icon: XCircle },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="bg-surface-900 border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
            <Icon className="w-4 h-4 text-gray-500 mb-2" />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
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
            {t.dot && filter === t.key && <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />}
            {t.label}
            {t.key !== 'all' && totals.counts?.[t.key] > 0 && (
              <span className="bg-white/[0.08] px-1.5 py-0.5 rounded-full text-[10px]">
                {totals.counts[t.key]}
              </span>
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
          placeholder="Search by courier or bank…"
          className="w-full bg-surface-900 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Table */}
      <div className="bg-surface-900 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {['Courier', 'Amount', 'Bank', 'Account', 'Status', 'Requested', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-white/[0.05] rounded animate-pulse" style={{ width: `${60 + (j * 20) % 80}px` }} />
                    </td>
                  ))}
                </tr>
              )) : filtered.map(w => (
                <tr
                  key={w.id}
                  onClick={() => setSelected(w)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="text-white font-medium whitespace-nowrap">{w.courier?.full_name || '–'}</p>
                    <p className="text-xs text-gray-500">{w.courier?.email}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-white whitespace-nowrap">₦{(w.amount || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{w.bank_name || '–'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{w.account_number || '–'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_STYLES[w.status] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(w); }}
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
            <Banknote className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No withdrawals found</p>
          </div>
        )}
      </div>

      {selected && (
        <WithdrawalModal withdrawal={selected} onClose={() => setSelected(null)} onUpdate={load} />
      )}
    </div>
  );
}
