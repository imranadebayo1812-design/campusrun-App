import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Routes, Route, useNavigate, NavLink } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, Package, Users, UtensilsCrossed,
  AlertTriangle, CreditCard, ArrowLeft, CheckCircle, XCircle, Ban
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Orders Tab ───────────────────────────────────────────────
function AdminOrdersTab() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('active');

  const { data: orders = [] } = useQuery({
    queryKey: ['admin-orders', tab],
    queryFn: async () => {
      let q = supabase.from('deliveries').select('*, profiles!buyer_id(full_name, email)');
      if (tab === 'active') {
        q = q.not('status', 'in', '("delivered","cancelled")');
      } else if (tab === 'flagged') {
        q = q.eq('price_edit_flag', true);
      } else {
        q = q.in('status', ['delivered', 'cancelled']).limit(50);
      }
      const { data } = await q.order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: tab === 'active' ? 25_000 : false,
  });

  const STATUS_COLOR = {
    placed: 'bg-yellow-100 text-yellow-700',
    bought: 'bg-blue-100 text-blue-700',
    on_the_way: 'bg-purple-100 text-purple-700',
    arrived: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex rounded-lg bg-gray-100 p-1">
        {['active', 'flagged', 'history'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {orders.map(order => (
          <div key={order.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs font-mono text-gray-400">{order.id.slice(0, 8)}</p>
                <p className="text-sm font-medium text-gray-900">{order.profiles?.full_name || order.profiles?.email}</p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.status]}`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
                <p className="text-sm font-bold text-brand-600 mt-0.5">₦{order.total_amount?.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600">{order.pickup_location} → {order.dropoff_location}</p>
            <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}</p>

            {order.price_edit_flag && !order.price_edit_buyer_response && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Price edit pending buyer response
              </div>
            )}

            {order.status !== 'delivered' && order.status !== 'cancelled' && (
              <button
                onClick={async () => {
                  if (!window.confirm('Force cancel this order?')) return;
                  await supabase.from('deliveries').update({ status: 'cancelled', cancelled_by: 'admin' }).eq('id', order.id);
                  queryClient.invalidateQueries(['admin-orders']);
                }}
                className="mt-2 text-xs text-red-600 font-medium"
              >
                Force Cancel
              </button>
            )}
          </div>
        ))}
        {orders.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No orders</p>}
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────
function AdminUsersTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      let q = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
      if (search) q = q.ilike('full_name', `%${search}%`);
      const { data } = await q;
      return data || [];
    },
  });

  async function toggleBlacklist(user) {
    const reason = user.is_blacklisted ? null : window.prompt('Reason for blacklisting:');
    if (!user.is_blacklisted && !reason) return;
    await supabase.from('profiles').update({
      is_blacklisted: !user.is_blacklisted,
      blacklist_reason: reason,
    }).eq('id', user.id);
    queryClient.invalidateQueries(['admin-users']);
  }

  async function toggleAdmin(user) {
    if (!window.confirm(`${user.is_admin ? 'Remove' : 'Grant'} admin for ${user.full_name}?`)) return;
    await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id);
    queryClient.invalidateQueries(['admin-users']);
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{user.full_name || '(no name)'}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
                <div className="flex gap-1.5 mt-1">
                  {user.is_admin && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Admin</span>}
                  {user.is_courier && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Courier</span>}
                  {user.is_blacklisted && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Banned</span>}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => toggleBlacklist(user)}
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${user.is_blacklisted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {user.is_blacklisted ? 'Unban' : 'Ban'}
                </button>
                <button onClick={() => toggleAdmin(user)}
                  className="text-xs px-2 py-1 rounded-lg font-medium bg-purple-100 text-purple-700">
                  {user.is_admin ? 'Revoke Admin' : 'Make Admin'}
                </button>
              </div>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-gray-400">
              <span>Balance: ₦{user.wallet_balance?.toLocaleString()}</span>
              <span>Fraud: {user.fraud_score}</span>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No users found</p>}
      </div>
    </div>
  );
}

// ─── Menu Tab ─────────────────────────────────────────────────
function AdminMenuTab() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ vendor_name: '', name: '', price: '', description: '' });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['admin-menu'],
    queryFn: async () => {
      const { data } = await supabase.from('menu_items').select('*').order('vendor_name').order('name');
      return data || [];
    },
  });

  async function addItem() {
    if (!form.vendor_name || !form.name || !form.price) return;
    setSaving(true);
    await supabase.from('menu_items').insert({
      vendor_name: form.vendor_name,
      name: form.name,
      price: parseFloat(form.price),
      description: form.description,
    });
    queryClient.invalidateQueries(['admin-menu']);
    setForm({ vendor_name: '', name: '', price: '', description: '' });
    setAdding(false);
    setSaving(false);
  }

  async function toggleAvailability(item) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id);
    queryClient.invalidateQueries(['admin-menu']);
  }

  async function deleteItem(id) {
    if (!window.confirm('Delete this item?')) return;
    await supabase.from('menu_items').delete().eq('id', id);
    queryClient.invalidateQueries(['admin-menu']);
  }

  const vendors = [...new Set(items.map(i => i.vendor_name))];

  return (
    <div className="space-y-4">
      {!adding ? (
        <button onClick={() => setAdding(true)}
          className="w-full bg-brand-500 text-white font-semibold py-2.5 rounded-xl text-sm">
          + Add Menu Item
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <p className="font-semibold text-sm text-gray-900">New Menu Item</p>
          {[
            { label: 'Vendor', field: 'vendor_name', placeholder: 'Food Court' },
            { label: 'Item Name', field: 'name', placeholder: 'Jollof Rice' },
            { label: 'Price (₦)', field: 'price', placeholder: '500', type: 'number' },
            { label: 'Description', field: 'description', placeholder: 'Optional' },
          ].map(({ label, field, placeholder, type = 'text' }) => (
            <div key={field}>
              <label className="text-xs text-gray-600">{label}</label>
              <input type={type} value={form[field]} onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="flex-1 border border-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium">Cancel</button>
            <button onClick={addItem} disabled={saving} className="flex-1 bg-brand-500 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Add'}</button>
          </div>
        </div>
      )}

      {vendors.map(vendor => (
        <div key={vendor}>
          <p className="text-sm font-bold text-gray-700 mb-2">{vendor}</p>
          <div className="space-y-1.5">
            {items.filter(i => i.vendor_name === vendor).map(item => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-2 shadow-sm">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">₦{item.price?.toLocaleString()}</p>
                </div>
                <button onClick={() => toggleAvailability(item)}
                  className={`text-xs px-2 py-1 rounded-lg font-medium ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {item.is_available ? 'Available' : 'Hidden'}
                </button>
                <button onClick={() => deleteItem(item.id)} className="text-red-400 ml-1">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No menu items yet</p>}
    </div>
  );
}

// ─── Withdrawals Tab ──────────────────────────────────────────
function AdminWithdrawalsTab() {
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*, profiles!courier_id(full_name, email)')
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  async function processRequest(id, status, note = '') {
    await supabase.from('withdrawal_requests').update({
      status,
      admin_note: note,
      processed_at: new Date().toISOString(),
    }).eq('id', id);
    queryClient.invalidateQueries(['admin-withdrawals']);
  }

  return (
    <div className="space-y-3">
      {requests.map(req => (
        <div key={req.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">{req.profiles?.full_name}</p>
              <p className="text-xs text-gray-500">{req.bank_name} — {req.account_number}</p>
              <p className="text-xs text-gray-500">{req.account_name}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">₦{req.amount?.toLocaleString()}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                req.status === 'paid' ? 'bg-green-100 text-green-700' :
                req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>{req.status}</span>
            </div>
          </div>
          {req.status === 'pending' && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  const note = window.prompt('Rejection reason:');
                  if (note !== null) processRequest(req.id, 'rejected', note);
                }}
                className="flex-1 border border-red-200 text-red-600 text-xs font-semibold py-2 rounded-xl"
              >
                Reject
              </button>
              <button
                onClick={() => processRequest(req.id, 'paid')}
                className="flex-1 bg-green-600 text-white text-xs font-semibold py-2 rounded-xl"
              >
                Mark as Paid
              </button>
            </div>
          )}
          {req.admin_note && <p className="text-xs text-gray-500 mt-1">{req.admin_note}</p>}
        </div>
      ))}
      {requests.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No withdrawal requests</p>}
    </div>
  );
}

// ─── Main Admin Portal ────────────────────────────────────────
const TABS = [
  { key: 'orders', label: 'Orders', icon: Package },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { key: 'withdrawals', label: 'Payouts', icon: CreditCard },
];

export default function AdminPortal() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Admin Portal</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center py-2 rounded-lg text-xs font-medium transition-all ${tab === key ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
          >
            <Icon className="w-4 h-4 mb-0.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'orders' && <AdminOrdersTab />}
      {tab === 'users' && <AdminUsersTab />}
      {tab === 'menu' && <AdminMenuTab />}
      {tab === 'withdrawals' && <AdminWithdrawalsTab />}
    </div>
  );
}
