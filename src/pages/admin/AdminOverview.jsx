import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { formatDistanceToNow, startOfDay } from 'date-fns';
import {
  Users, Package, CheckCircle, TrendingUp,
  Clock, Banknote, ArrowRight, RefreshCw, DollarSign, PieChart,
} from 'lucide-react';

const STATUS_BADGE = {
  placed:      'bg-blue-500/15 text-blue-400',
  bought:      'bg-yellow-500/15 text-yellow-400',
  on_the_way:  'bg-purple-500/15 text-purple-400',
  arrived:     'bg-orange-500/15 text-orange-400',
  delivered:   'bg-green-500/15 text-green-400',
  cancelled:   'bg-red-500/15 text-red-400',
};
const STATUS_LABEL = {
  placed: 'Placed', bought: 'Bought', on_the_way: 'On the Way',
  arrived: 'Arrived', delivered: 'Delivered', cancelled: 'Cancelled',
};

function StatCard({ icon: Icon, label, value, sub, color, loading }) {
  return (
    <div className={`bg-surface-900 border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.replace('bg-gradient', 'bg').replace(/from-\S+/, '').replace(/to-\S+/, '')} bg-white/[0.06]`}>
          <Icon className="w-4.5 h-4.5 text-gray-300" />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-20 bg-white/[0.06] rounded-lg animate-pulse mb-1" />
      ) : (
        <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      )}
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    const todayStart = startOfDay(new Date()).toISOString();

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [
      { count: totalUsers },
      { count: activeDeliveries },
      { count: completedToday },
      { data: revenueRows },
      { count: pendingWithdrawals },
      { count: newUsersWeek },
      { data: recentDel },
      { data: recentU },
      { data: serviceFeeAllTime },
      { data: serviceFeeMth },
      { data: commissionRows },
      { data: tipsRows },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('deliveries').select('*', { count: 'exact', head: true }).not('status', 'in', '("delivered","cancelled")'),
      supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('status', 'delivered').gte('delivered_at', todayStart),
      supabase.from('deliveries').select('total_amount').eq('status', 'delivered').eq('payment_verified', true).gte('delivered_at', todayStart),
      supabase.from('courier_withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      supabase.from('deliveries')
        .select('id, status, total_amount, created_at, pickup_location, dropoff_location, buyer:profiles!buyer_id(full_name)')
        .order('created_at', { ascending: false }).limit(8),
      supabase.from('profiles')
        .select('id, full_name, email, created_at, is_courier')
        .order('created_at', { ascending: false }).limit(6),
      // Platform revenue: service fees on paid non-cancelled orders
      supabase.from('deliveries').select('service_fee').eq('payment_verified', true).neq('status', 'cancelled').limit(50000),
      supabase.from('deliveries').select('service_fee').eq('payment_verified', true).neq('status', 'cancelled').gte('created_at', monthStart).limit(50000),
      // Commission: 15% kept from courier earnings transfers
      supabase.from('courier_withdrawals').select('commission').eq('status', 'completed').eq('type', 'earnings').limit(50000),
      // Tips collected (all time)
      supabase.from('deliveries').select('tip').eq('status', 'delivered').gt('tip', 0).limit(50000),
    ]);

    const revenueToday   = (revenueRows || []).reduce((s, d) => s + (d.total_amount || 0), 0);
    const svcAll         = (serviceFeeAllTime || []).reduce((s, d) => s + (d.service_fee || 0), 0);
    const svcMonth       = (serviceFeeMth || []).reduce((s, d) => s + (d.service_fee || 0), 0);
    const commissionAll  = (commissionRows || []).reduce((s, d) => s + (d.commission || 0), 0);
    const tipsAll        = (tipsRows || []).reduce((s, d) => s + (d.tip || 0), 0);
    const netRevenue     = svcAll + commissionAll;

    setStats({
      totalUsers, activeDeliveries, completedToday, revenueToday, pendingWithdrawals, newUsersWeek,
      svcAll, svcMonth, commissionAll, tipsAll, netRevenue,
    });
    setRecentDeliveries(recentDel || []);
    setRecentUsers(recentU || []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  // Realtime — refresh stats when deliveries change
  useEffect(() => {
    const ch = supabase.channel('admin-overview')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => load(true))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  const STAT_CARDS = [
    { icon: Users,       label: 'Total Users',           value: stats.totalUsers?.toLocaleString() ?? '–',       color: 'bg-gradient-to-r from-brand-500 to-indigo-500',  sub: `+${stats.newUsersWeek ?? 0} this week` },
    { icon: Package,     label: 'Active Deliveries',     value: stats.activeDeliveries ?? '–',                   color: 'bg-gradient-to-r from-blue-500 to-cyan-500' },
    { icon: CheckCircle, label: 'Completed Today',       value: stats.completedToday ?? '–',                     color: 'bg-gradient-to-r from-green-500 to-emerald-500' },
    { icon: TrendingUp,  label: 'Revenue Today',         value: `₦${(stats.revenueToday ?? 0).toLocaleString()}`, color: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
    { icon: Banknote,    label: 'Pending Withdrawals',   value: stats.pendingWithdrawals ?? '–',                  color: 'bg-gradient-to-r from-red-500 to-pink-500',      sub: stats.pendingWithdrawals > 0 ? 'Needs attention' : 'All clear' },
    { icon: Clock,       label: 'New Users (7 days)',    value: stats.newUsersWeek ?? '–',                        color: 'bg-gradient-to-r from-purple-500 to-violet-500' },
  ];

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time snapshot of CampusRun operations</p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-white/[0.08] text-gray-400 hover:text-white rounded-xl text-sm font-medium transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {STAT_CARDS.map(card => (
          <StatCard key={card.label} {...card} loading={loading} />
        ))}
      </div>

      {/* Platform Revenue */}
      <div className="bg-surface-900 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
          <PieChart className="w-4 h-4 text-yellow-400" aria-hidden="true" />
          <p className="text-sm font-semibold text-white">Platform Revenue</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/[0.06]">
          {[
            { label: 'Net Revenue (all time)', value: `₦${(stats.netRevenue ?? 0).toLocaleString()}`, sub: 'Service fees + commissions', color: 'text-yellow-400' },
            { label: 'Service Fees (this month)', value: `₦${(stats.svcMonth ?? 0).toLocaleString()}`, sub: `₦${(stats.svcAll ?? 0).toLocaleString()} all time`, color: 'text-brand-400' },
            { label: 'Commission Earned', value: `₦${(stats.commissionAll ?? 0).toLocaleString()}`, sub: '15% of courier earnings withdrawn', color: 'text-green-400' },
            { label: 'Tips Passed to Runners', value: `₦${(stats.tipsAll ?? 0).toLocaleString()}`, sub: '100% goes to couriers', color: 'text-purple-400' },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="px-5 py-4">
              {loading ? (
                <div className="h-7 w-24 bg-white/[0.06] rounded-lg animate-pulse mb-1" />
              ) : (
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Recent deliveries */}
        <div className="xl:col-span-2 bg-surface-900 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">Recent Deliveries</p>
            <button onClick={() => navigate('/admin/deliveries')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {['Order', 'Buyer', 'Route', 'Status', 'Amount'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.03]">
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-3.5 bg-white/[0.05] rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                )) : recentDeliveries.map(d => (
                  <tr key={d.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => navigate('/admin/deliveries')}>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">{d.id.slice(0, 8)}</td>
                    <td className="px-5 py-3 text-gray-300">{d.buyer?.full_name || '–'}</td>
                    <td className="px-5 py-3 text-gray-500 max-w-[160px] truncate text-xs">{d.pickup_location} → {d.dropoff_location}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGE[d.status] || 'bg-gray-500/15 text-gray-400'}`}>
                        {STATUS_LABEL[d.status] || d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-white">₦{(d.total_amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && recentDeliveries.length === 0 && (
              <p className="text-center text-gray-600 text-sm py-8">No deliveries yet</p>
            )}
          </div>
        </div>

        {/* Recent users */}
        <div className="bg-surface-900 border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <p className="text-sm font-semibold text-white">New Users</p>
            <button onClick={() => navigate('/admin/users')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {loading ? Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] animate-pulse shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3 bg-white/[0.06] rounded animate-pulse w-24" />
                  <div className="h-2.5 bg-white/[0.04] rounded animate-pulse w-32" />
                </div>
              </div>
            )) : recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/40 to-indigo-500/40 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-brand-300">{(u.full_name || u.email || '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{u.full_name || 'No name'}</p>
                  <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
                </div>
                {u.is_courier && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-brand-500/15 text-brand-400 rounded-full font-medium shrink-0">Courier</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Manage Deliveries', desc: 'View & update orders', path: '/admin/deliveries', color: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20' },
          { label: 'Review Withdrawals', desc: `${stats.pendingWithdrawals || 0} pending`, path: '/admin/withdrawals', color: 'from-red-500/10 to-pink-500/10 border-red-500/20' },
          { label: 'Send Notification', desc: 'Broadcast a message', path: '/admin/notifications', color: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20' },
          { label: 'View Reports', desc: 'Revenue & analytics', path: '/admin/reports', color: 'from-purple-500/10 to-violet-500/10 border-purple-500/20' },
        ].map(({ label, desc, path, color }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`bg-gradient-to-br ${color} border rounded-2xl p-4 text-left hover:scale-[1.02] transition-all`}
          >
            <p className="text-sm font-semibold text-white mb-1">{label}</p>
            <p className="text-xs text-gray-500">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
