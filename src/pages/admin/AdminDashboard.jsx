import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MOCK_ADMIN_STATS, MOCK_REVENUE, MOCK_ORDERS_CHART, MOCK_REVENUE_CHART } from '@/lib/mockData';
import { TrendingUp, Users, Package, CheckCircle, XCircle, DollarSign, Star, Percent, Banknote } from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function RevenueCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-surface-900 border border-white/[0.08] rounded-xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-400 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-600">{sub}</p>}
      </div>
      <p className="text-sm font-bold text-white shrink-0">₦{value.toLocaleString()}</p>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 12 },
  cursor: { fill: 'rgba(124,58,237,0.08)' },
};

export default function AdminDashboard() {
  const s = MOCK_ADMIN_STATS;
  const r = MOCK_REVENUE;

  return (
    <div className="space-y-6">
      {/* Status notice */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-400">
        Orders close at <strong>10:30 PM WAT</strong>. Full history loads after closing.
        Active, flagged &amp; disputed orders are always visible.
      </div>

      {/* Stats cards */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Today's Activity</p>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Active Orders" value={s.active_orders} icon={Package} color="bg-brand-600" />
          <StatCard label="Delivered" value={s.delivered_today} icon={CheckCircle} color="bg-green-700" />
          <StatCard label="Cancelled" value={s.cancelled_today} icon={XCircle} color="bg-red-700" />
          <StatCard label="Total Users" value={s.total_users.toLocaleString()} sub={`${s.online_users} online now`} icon={Users} color="bg-indigo-700" />
        </div>
      </div>

      {/* Revenue breakdown */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Platform Revenue</p>
        <div className="space-y-2">
          <RevenueCard label="Total Platform Revenue" value={r.platform_total} icon={TrendingUp} color="bg-brand-600" />
          <RevenueCard label="Tips Paid to Couriers" value={r.tips_paid} icon={Banknote} color="bg-green-700" />
          <RevenueCard
            label="Campus Run Pro Subscriptions"
            sub={`${r.pro_subscriptions.count} subscribers · ₦250/month`}
            value={r.pro_subscriptions.monthly_revenue}
            icon={Star}
            color="bg-yellow-600"
          />
          <RevenueCard label="CampusRun Commission (10%)" value={r.commission} icon={Percent} color="bg-indigo-700" />
          <RevenueCard label="Service Fee Income" value={r.service_fee_income} icon={DollarSign} color="bg-purple-700" />
        </div>
      </div>

      {/* Charts */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Orders — Last 7 Days</p>
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MOCK_ORDERS_CHART} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip {...tooltipStyle} formatter={v => [v, 'Orders']} />
              <Bar dataKey="orders" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Revenue — Last 7 Days</p>
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={MOCK_REVENUE_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={v => [`₦${v.toLocaleString()}`, 'Revenue']} />
              <Line type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
