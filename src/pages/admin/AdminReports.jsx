import { useState, useEffect } from 'react';
import { supabase } from '@/api/supabaseClient';
import { subDays, format, startOfDay, endOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, DollarSign, Package, Users, RefreshCw, Download } from 'lucide-react';

const COLORS = ['#ffffff', '#d4d4d4', '#a3a3a3', '#737373', '#4b5563'];

function CustomTooltip({ active, payload, label, prefix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.10] rounded-xl px-3 py-2.5 shadow-xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {prefix}{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminReports() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const from = startOfDay(subDays(new Date(), period - 1)).toISOString();
    const to = endOfDay(new Date()).toISOString();

    const [
      { data: deliveries },
      { data: users },
      { data: walletTx },
      { data: withdrawals },
      { count: totalUsers },
      { count: totalDeliveries },
      { count: totalCouriers },
    ] = await Promise.all([
      supabase.from('deliveries')
        .select('id, status, total_amount, delivery_fee, service_fee, created_at, delivered_at, payment_method')
        .gte('created_at', from).lte('created_at', to),
      supabase.from('profiles')
        .select('id, created_at, is_courier')
        .gte('created_at', from),
      supabase.from('wallet_transactions')
        .select('amount, type, created_at')
        .gte('created_at', from),
      supabase.from('courier_withdrawals')
        .select('commission, created_at')
        .gte('created_at', from),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('deliveries').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_courier', true),
    ]);

    // Build day-by-day chart data
    const days = eachDayOfInterval({ start: subDays(new Date(), period - 1), end: new Date() });
    const dayMap = {};
    days.forEach(d => {
      dayMap[format(d, 'MMM d')] = { date: format(d, 'MMM d'), orders: 0, net_income: 0, users: 0, deliveries_completed: 0 };
    });

    (deliveries || []).forEach(d => {
      const key = format(parseISO(d.created_at), 'MMM d');
      if (dayMap[key]) {
        dayMap[key].orders += 1;
        if (d.status === 'delivered') {
          dayMap[key].net_income += d.service_fee || 0;
          dayMap[key].deliveries_completed += 1;
        }
      }
    });

    (withdrawals || []).forEach(w => {
      const key = format(parseISO(w.created_at), 'MMM d');
      if (dayMap[key]) dayMap[key].net_income += w.commission || 0;
    });

    (users || []).forEach(u => {
      const key = format(parseISO(u.created_at), 'MMM d');
      if (dayMap[key]) dayMap[key].users += 1;
    });

    const chartData = Object.values(dayMap);

    // Status breakdown
    const statusMap = {};
    (deliveries || []).forEach(d => { statusMap[d.status] = (statusMap[d.status] || 0) + 1; });
    const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

    // Payment method breakdown
    const pmMap = {};
    (deliveries || []).forEach(d => {
      const pm = d.payment_method || 'unknown';
      pmMap[pm] = (pmMap[pm] || 0) + 1;
    });
    const paymentData = Object.entries(pmMap).map(([name, value]) => ({ name, value }));

    // Totals
    const totalGMV = (deliveries || []).filter(d => d.status === 'delivered' && d.total_amount)
      .reduce((s, d) => s + d.total_amount, 0);
    const totalServiceFees = (deliveries || []).filter(d => d.status === 'delivered')
      .reduce((s, d) => s + (d.service_fee || 0), 0);
    const totalCommissions = (withdrawals || [])
      .reduce((s, w) => s + (w.commission || 0), 0);
    const netIncome = totalServiceFees + totalCommissions;
    const completedCount = (deliveries || []).filter(d => d.status === 'delivered').length;
    const cancelledCount = (deliveries || []).filter(d => d.status === 'cancelled').length;
    const completionRate = deliveries?.length > 0 ? Math.round((completedCount / deliveries.length) * 100) : 0;

    // Wallet top-up total
    const walletTopupTotal = (walletTx || []).filter(t => t.type === 'topup')
      .reduce((s, t) => s + (t.amount || 0), 0);

    setData({
      chartData, statusData, paymentData,
      totals: { totalGMV, totalServiceFees, totalCommissions, netIncome, completedCount, cancelledCount, completionRate, walletTopupTotal },
      summary: { totalUsers, totalDeliveries, totalCouriers, newUsers: users?.length || 0 },
    });
    setLoading(false);
  }

  useEffect(() => { load(); }, [period]);

  const periodTabs = [
    { days: 7, label: '7D' },
    { days: 30, label: '30D' },
    { days: 90, label: '90D' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Business performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-900 border border-white/[0.08] rounded-xl p-1 gap-0.5">
            {periodTabs.map(t => (
              <button
                key={t.days}
                onClick={() => setPeriod(t.days)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  period === t.days ? 'bg-brand-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-surface-900 border border-white/[0.08] text-gray-400 hover:text-white rounded-xl text-sm transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: `Net Income (${period}d)`, value: `₦${((data?.totals.netIncome || 0) / 1000).toFixed(1)}k`, sub: `₦${(data?.totals.totalServiceFees || 0).toLocaleString()} fees + ₦${(data?.totals.totalCommissions || 0).toLocaleString()} commissions`, icon: DollarSign, color: 'from-green-500 to-emerald-500' },
          { label: `Orders (${period}d)`, value: data?.totals.completedCount ?? '–', sub: `${data?.totals.completionRate ?? 0}% completion rate`, icon: Package, color: 'from-blue-500 to-cyan-500' },
          { label: `New Users (${period}d)`, value: data?.summary.newUsers ?? '–', sub: `${data?.summary.totalUsers ?? 0} total registered`, icon: Users, color: 'from-brand-500 to-indigo-500' },
          { label: 'Wallet Top-ups', value: `₦${((data?.totals.walletTopupTotal || 0) / 1000).toFixed(1)}k`, sub: `Last ${period} days`, icon: TrendingUp, color: 'from-yellow-500 to-orange-500' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${color}`} />
            <Icon className="w-4 h-4 text-gray-500 mb-3" />
            {loading ? (
              <div className="h-7 w-20 bg-white/[0.06] rounded-lg animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
            )}
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5">
        <p className="text-sm font-semibold text-white mb-4">Net Income & Orders Over Time</p>
        {loading ? (
          <div className="h-48 bg-white/[0.03] rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.chartData || []} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor((data?.chartData?.length || 1) / 6)}
              />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="net_income" stroke="#ffffff" strokeWidth={2} dot={false} name="Net Income (₦)" />
              <Line type="monotone" dataKey="orders" stroke="#a3a3a3" strokeWidth={2} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily orders bar */}
        <div className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">Daily Completed Deliveries</p>
          {loading ? (
            <div className="h-40 bg-white/[0.03] rounded-xl animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data?.chartData || []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor((data?.chartData?.length || 1) / 5)}
                />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={25} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="deliveries_completed" fill="#ffffff" radius={[3, 3, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5">
          <p className="text-sm font-semibold text-white mb-4">Order Status Breakdown</p>
          {loading ? (
            <div className="h-40 bg-white/[0.03] rounded-xl animate-pulse" />
          ) : !data?.statusData?.length ? (
            <p className="text-center text-gray-600 text-sm py-8">No data</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie data={data.statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                    {data.statusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {data.statusData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-400 capitalize">{entry.name?.replace('_', ' ')}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New users chart */}
      <div className="bg-surface-900 border border-white/[0.06] rounded-2xl p-5">
        <p className="text-sm font-semibold text-white mb-4">New User Registrations</p>
        {loading ? (
          <div className="h-36 bg-white/[0.03] rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={data?.chartData || []} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor((data?.chartData?.length || 1) / 6)}
              />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} width={25} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="users" fill="#059669" radius={[3, 3, 0, 0]} name="New Users" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary table */}
      <div className="bg-surface-900 border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="text-sm font-semibold text-white">Platform Summary</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {loading ? Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex justify-between px-5 py-3.5">
              <div className="h-3.5 bg-white/[0.06] rounded animate-pulse w-32" />
              <div className="h-3.5 bg-white/[0.06] rounded animate-pulse w-20" />
            </div>
          )) : [
            { label: 'Total Registered Users', value: (data?.summary.totalUsers || 0).toLocaleString() },
            { label: 'Total Couriers', value: (data?.summary.totalCouriers || 0).toLocaleString() },
            { label: 'Total Deliveries (All Time)', value: (data?.summary.totalDeliveries || 0).toLocaleString() },
            { label: `Completed Deliveries (${period}d)`, value: data?.totals.completedCount || 0 },
            { label: `Cancelled Deliveries (${period}d)`, value: data?.totals.cancelledCount || 0 },
            { label: `Completion Rate (${period}d)`, value: `${data?.totals.completionRate || 0}%` },
            { label: `Net Income (${period}d)`, value: `₦${(data?.totals.netIncome || 0).toLocaleString()}` },
            { label: `  — Service Fees (${period}d)`, value: `₦${(data?.totals.totalServiceFees || 0).toLocaleString()}` },
            { label: `  — Courier Commissions (${period}d)`, value: `₦${(data?.totals.totalCommissions || 0).toLocaleString()}` },
            { label: `GMV / Order Value (${period}d)`, value: `₦${(data?.totals.totalGMV || 0).toLocaleString()}` },
            { label: `Wallet Top-ups (${period}d)`, value: `₦${(data?.totals.walletTopupTotal || 0).toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-400">{label}</span>
              <span className="text-sm font-semibold text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
