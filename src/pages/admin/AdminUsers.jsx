import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Search, RefreshCw, Users, Shield, Bike,
  Ban, CheckCircle, Eye, Mail, Phone, Calendar,
  Wallet, Package,
} from 'lucide-react';

function UserDetailModal({ user, onClose, onUpdate }) {
  const [profile, setProfile] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState('info');

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: d }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('deliveries').select('id, status, total_amount, created_at, pickup_location, dropoff_location')
          .eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(10),
      ]);
      setProfile(p);
      setDeliveries(d || []);
      setLoading(false);
    }
    load();
  }, [user.id]);

  async function toggleBlacklist() {
    setActionLoading(true);
    const isBlacklisted = profile?.is_blacklisted;
    await supabase.from('profiles').update(
      isBlacklisted
        ? { is_blacklisted: false, blacklist_reason: null }
        : { is_blacklisted: true, blacklist_reason: blacklistReason || 'Admin action' }
    ).eq('id', user.id);
    setActionLoading(false);
    onUpdate();
    onClose();
  }

  async function toggleCourier() {
    setActionLoading(true);
    await supabase.from('profiles').update({ is_courier: !profile?.is_courier }).eq('id', user.id);
    setActionLoading(false);
    onUpdate();
    onClose();
  }

  const STATUS_COLORS = {
    placed: 'text-blue-400', bought: 'text-yellow-400', on_the_way: 'text-purple-400',
    arrived: 'text-orange-400', delivered: 'text-green-400', cancelled: 'text-red-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="bg-[#0d0d1f] border border-white/[0.08] rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500/30 to-indigo-500/30 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-brand-300">
              {(user.full_name || user.email || '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate">{user.full_name || 'No name'}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user.is_courier && (
              <span className="text-[10px] px-2 py-0.5 bg-brand-500/15 text-brand-400 border border-brand-500/20 rounded-full">Courier</span>
            )}
            {user.is_admin && (
              <span className="text-[10px] px-2 py-0.5 bg-yellow-500/15 text-yellow-400 border border-yellow-500/20 rounded-full">Admin</span>
            )}
            {user.is_blacklisted && (
              <span className="text-[10px] px-2 py-0.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-full">Banned</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl font-bold leading-none ml-2">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] shrink-0">
          {['info', 'orders', 'actions'].map(t => (
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

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tab === 'info' ? (
            <>
              {[
                { icon: Mail, label: 'Email', value: profile?.email },
                { icon: Phone, label: 'Phone', value: profile?.phone || '–' },
                { icon: Calendar, label: 'Joined', value: profile?.created_at ? format(new Date(profile.created_at), 'PPP') : '–' },
                { icon: Wallet, label: 'Wallet Balance', value: `₦${(profile?.wallet_balance || 0).toLocaleString()}` },
                { icon: Package, label: 'Referral Code', value: profile?.referral_code || '–' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 bg-white/[0.03] rounded-xl px-4 py-3">
                  <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-white truncate">{value}</p>
                  </div>
                </div>
              ))}
            </>
          ) : tab === 'orders' ? (
            <div className="space-y-2">
              {deliveries.length === 0 ? (
                <p className="text-center text-gray-600 text-sm py-6">No orders yet</p>
              ) : deliveries.map(d => (
                <div key={d.id} className="bg-white/[0.03] rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-gray-400">{d.id.slice(0, 8)}</span>
                    <span className={`text-xs font-medium ${STATUS_COLORS[d.status] || 'text-gray-400'}`}>
                      {d.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{d.pickup_location} → {d.dropoff_location}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-600">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                    <span className="text-xs font-medium text-white">₦{(d.total_amount || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Toggle courier */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-1">Courier Status</p>
                <p className="text-xs text-gray-500 mb-3">
                  {profile?.is_courier ? 'This user is a courier. Remove courier access if needed.' : 'Grant courier access to allow this user to accept deliveries.'}
                </p>
                <button
                  onClick={toggleCourier}
                  disabled={actionLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all ${
                    profile?.is_courier
                      ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                      : 'bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 border border-brand-500/20'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  {profile?.is_courier ? 'Remove Courier Access' : 'Grant Courier Access'}
                </button>
              </div>

              {/* Blacklist */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <p className="text-sm font-medium text-white mb-1">Account Status</p>
                <p className="text-xs text-gray-500 mb-3">
                  {profile?.is_blacklisted
                    ? `Banned: "${profile.blacklist_reason}". Restore access below.`
                    : 'Ban this user to prevent them from using the app.'}
                </p>
                {!profile?.is_blacklisted && (
                  <input
                    value={blacklistReason}
                    onChange={e => setBlacklistReason(e.target.value)}
                    placeholder="Reason for ban (optional)"
                    className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 mb-3"
                  />
                )}
                <button
                  onClick={toggleBlacklist}
                  disabled={actionLoading}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all ${
                    profile?.is_blacklisted
                      ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25 border border-green-500/20'
                      : 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                  }`}
                >
                  {profile?.is_blacklisted ? <><CheckCircle className="w-4 h-4" /> Restore Access</> : <><Ban className="w-4 h-4" /> Ban User</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('profiles')
      .select('id, full_name, email, is_courier, is_admin, is_blacklisted, created_at, wallet_balance', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filter === 'couriers') q = q.eq('is_courier', true);
    else if (filter === 'admins') q = q.eq('is_admin', true);
    else if (filter === 'banned') q = q.eq('is_blacklisted', true);

    if (search.trim()) {
      q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count } = await q;
    setUsers(data || []);
    setTotal(count || 0);
    setLoading(false);
  }, [filter, search, page]);

  useEffect(() => { load(); }, [load]);

  const filterTabs = [
    { key: 'all', label: 'All Users' },
    { key: 'couriers', label: 'Couriers' },
    { key: 'admins', label: 'Admins' },
    { key: 'banned', label: 'Banned' },
  ];

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} registered accounts</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-white/[0.08] text-gray-400 hover:text-white rounded-xl text-sm transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search by name or email…"
          className="w-full bg-surface-900 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {filterTabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setFilter(t.key); setPage(0); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              filter === t.key
                ? 'bg-brand-500/15 text-brand-400 border-brand-500/30'
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
                {['User', 'Email', 'Role', 'Wallet', 'Joined', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(8).fill(0).map((_, i) => (
                <tr key={i} className="border-b border-white/[0.03]">
                  {Array(7).fill(0).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 bg-white/[0.05] rounded animate-pulse" style={{ width: `${60 + (j * 20) % 80}px` }} />
                    </td>
                  ))}
                </tr>
              )) : users.map(u => (
                <tr
                  key={u.id}
                  onClick={() => setSelected(u)}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/30 to-indigo-500/30 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-brand-300">
                          {(u.full_name || u.email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white font-medium whitespace-nowrap">{u.full_name || 'No name'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {u.is_admin && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/15 text-yellow-400 rounded-full">Admin</span>}
                      {u.is_courier && <span className="text-[10px] px-1.5 py-0.5 bg-brand-500/15 text-brand-400 rounded-full">Courier</span>}
                      {!u.is_admin && !u.is_courier && <span className="text-[10px] text-gray-600">Buyer</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                    ₦{(u.wallet_balance || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_blacklisted
                      ? <span className="text-[10px] px-1.5 py-0.5 bg-red-500/15 text-red-400 border border-red-500/20 rounded-full">Banned</span>
                      : <span className="text-[10px] px-1.5 py-0.5 bg-green-500/15 text-green-400 border border-green-500/20 rounded-full">Active</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={e => { e.stopPropagation(); setSelected(u); }}
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

        {!loading && users.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No users found</p>
          </div>
        )}

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
              >Prev</button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= total}
                className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-gray-400 disabled:opacity-40 hover:bg-white/[0.08] transition-colors"
              >Next</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <UserDetailModal user={selected} onClose={() => setSelected(null)} onUpdate={load} />
      )}
    </div>
  );
}
