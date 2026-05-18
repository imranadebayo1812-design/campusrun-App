import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

const STATUS_STYLE = {
  pending:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  approved: 'bg-red-500/15 text-red-400 border-red-500/30',
  rejected: 'bg-green-500/15 text-green-400 border-green-500/30',
};

export default function AdminDeletions() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(null);
  const [filter, setFilter]     = useState('pending');

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('deletion_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id, status) {
    setActing(id);
    await supabase
      .from('deletion_requests')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status, reviewed_at: new Date().toISOString() } : r));
    setActing(null);
  }

  const filtered = requests.filter(r => filter === 'all' ? true : r.status === filter);

  const counts = {
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Deletion Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and action user account deletion requests</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white bg-surface-800 border border-white/[0.08] px-3 py-2 rounded-xl transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'pending',  label: 'Pending',  count: counts.pending },
          { key: 'approved', label: 'Approved', count: counts.approved },
          { key: 'rejected', label: 'Rejected', count: counts.rejected },
          { key: 'all',      label: 'All',      count: requests.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              filter === tab.key
                ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
                : 'text-gray-500 border-white/[0.06] bg-surface-800 hover:text-gray-300'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-brand-500/20 text-brand-300' : 'bg-white/[0.06] text-gray-500'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-surface-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Trash2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No {filter === 'all' ? '' : filter} requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <div key={req.id} className="bg-surface-900 border border-white/[0.08] rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-white truncate">{req.full_name || '—'}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLE[req.status] || STATUS_STYLE.pending}`}>
                      {req.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{req.email}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Requested {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                    </span>
                    {req.reviewed_at && (
                      <span>· Reviewed {formatDistanceToNow(new Date(req.reviewed_at), { addSuffix: true })}</span>
                    )}
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => updateStatus(req.id, 'rejected')}
                      disabled={acting === req.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold rounded-xl hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => updateStatus(req.id, 'approved')}
                      disabled={acting === req.id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
