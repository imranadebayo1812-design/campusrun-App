import { useState } from 'react';
import { MOCK_ADMIN_USERS } from '@/lib/mockData';
import { Search, ShieldOff, Shield } from 'lucide-react';

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState(MOCK_ADMIN_USERS);

  function toggleBlacklist(id) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_blacklisted: !u.is_blacklisted } : u));
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || [u.full_name, u.email, u.hostel].some(f => f?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users…"
          className="w-full bg-surface-800 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
        />
      </div>

      {/* User list */}
      <div className="space-y-2">
        {filtered.map(user => (
          <div
            key={user.id}
            className={`bg-surface-900 border rounded-xl p-4 ${user.is_blacklisted ? 'border-red-500/30' : 'border-white/[0.08]'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-semibold text-white">{user.full_name}</p>
                  {user.pro_subscriber && (
                    <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full font-semibold">Pro</span>
                  )}
                  {user.is_courier && (
                    <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">Courier</span>
                  )}
                  {user.is_blacklisted && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Banned</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{user.email}</p>
                <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                  <span>Orders: <strong className="text-white">{user.orders_count}</strong></span>
                  <span>Wallet: <strong className="text-white">₦{user.wallet_balance.toLocaleString()}</strong></span>
                  <span>Fraud: <strong className={user.fraud_score > 1 ? 'text-red-400' : 'text-white'}>{user.fraud_score}</strong></span>
                  <span>{user.campus_status === 'resident' ? user.hostel : 'Day Student'}</span>
                </div>
              </div>
              <button
                onClick={() => toggleBlacklist(user.id)}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  user.is_blacklisted
                    ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25'
                    : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                }`}
              >
                {user.is_blacklisted ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                {user.is_blacklisted ? 'Unban' : 'Ban'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
