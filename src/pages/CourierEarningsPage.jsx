import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, Wallet, ArrowUpRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CourierEarningsPage() {
  const { session, profile } = useAuth();
  const [withdrawing, setWithdrawing] = useState(false);
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const { data: deliveries = [] } = useQuery({
    queryKey: ['courier-completed', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('id, delivery_fee, food_cost, tip, delivered_at, pickup_location, dropoff_location')
        .eq('courier_id', session.user.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['withdrawals', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('courier_id', session.user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  async function requestWithdrawal() {
    const amt = parseFloat(amount);
    if (!amt || amt < 500) { setError('Minimum withdrawal is ₦500'); return; }
    if (amt > (profile?.wallet_balance || 0)) { setError('Insufficient wallet balance'); return; }
    if (!form.bank_name || !form.account_number || !form.account_name) { setError('Fill in all bank details'); return; }

    setError('');
    const { error: e } = await supabase.from('withdrawal_requests').insert({
      courier_id: session.user.id,
      amount: amt,
      ...form,
    });
    if (e) { setError(e.message); return; }
    setSuccess(true);
    setWithdrawing(false);
  }

  const totalEarned = deliveries.reduce((s, d) => s + (d.delivery_fee || 0) + (d.tip || 0), 0);

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Earnings</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-4 text-white shadow">
          <p className="text-xs opacity-80">Wallet Balance</p>
          <p className="text-2xl font-bold">₦{(profile?.wallet_balance || 0).toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-4 text-white shadow">
          <p className="text-xs opacity-80">Total Earned</p>
          <p className="text-2xl font-bold">₦{totalEarned.toLocaleString()}</p>
        </div>
      </div>

      {/* Withdraw */}
      {!withdrawing ? (
        <button
          onClick={() => setWithdrawing(true)}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-3 rounded-2xl"
        >
          <ArrowUpRight className="w-5 h-5" /> Request Withdrawal
        </button>
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
          <p className="font-semibold text-gray-900">Withdrawal Request</p>
          {[
            { label: 'Bank Name', field: 'bank_name', placeholder: 'e.g. GTBank' },
            { label: 'Account Number', field: 'account_number', placeholder: '0123456789' },
            { label: 'Account Name', field: 'account_name', placeholder: 'Full name on account' },
          ].map(({ label, field, placeholder }) => (
            <div key={field}>
              <label className="text-xs font-medium text-gray-600">{label}</label>
              <input
                value={form[field]}
                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                placeholder={placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-600">Amount (₦)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Min ₦500"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-600">Withdrawal request submitted! Processed within 24–48 hours.</p>}
          <div className="flex gap-2">
            <button onClick={() => setWithdrawing(false)} className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm">Cancel</button>
            <button onClick={requestWithdrawal} className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm">Submit</button>
          </div>
        </div>
      )}

      {/* Recent deliveries */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-brand-500" /> Completed Deliveries
        </p>
        {deliveries.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No completed deliveries yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveries.map(d => (
              <div key={d.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{d.pickup_location} → {d.dropoff_location}</p>
                  <p className="text-xs text-gray-400">{d.delivered_at ? formatDistanceToNow(new Date(d.delivered_at), { addSuffix: true }) : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">+₦{((d.delivery_fee || 0) + (d.tip || 0)).toLocaleString()}</p>
                  {d.tip > 0 && <p className="text-xs text-gray-400">+₦{d.tip} tip</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdrawal history */}
      {withdrawals.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> Withdrawal History
          </p>
          <div className="space-y-2">
            {withdrawals.map(w => (
              <div key={w.id} className="bg-white border border-gray-100 rounded-xl p-3 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-sm font-medium text-gray-900">{w.bank_name} — {w.account_number}</p>
                  <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">₦{w.amount?.toLocaleString()}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    w.status === 'paid' ? 'bg-green-100 text-green-700' :
                    w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{w.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
