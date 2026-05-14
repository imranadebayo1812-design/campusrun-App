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
      const { data } = await supabase.from('deliveries').select('id, delivery_fee, food_cost, tip, delivered_at, pickup_location, dropoff_location').eq('courier_id', session.user.id).eq('status', 'delivered').order('delivered_at', { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: withdrawals = [] } = useQuery({
    queryKey: ['withdrawals', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase.from('withdrawal_requests').select('*').eq('courier_id', session.user.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  async function requestWithdrawal() {
    const amt = parseFloat(amount);
    if (!amt || amt < 500) { setError('Minimum withdrawal is ₦500'); return; }
    if (amt > (profile?.wallet_balance || 0)) { setError('Insufficient wallet balance'); return; }
    if (!form.bank_name || !form.account_number || !form.account_name) { setError('Fill in all bank details'); return; }
    setError('');
    const { error: e } = await supabase.from('withdrawal_requests').insert({ courier_id: session.user.id, amount: amt, ...form });
    if (e) { setError(e.message); return; }
    setSuccess(true); setWithdrawing(false);
  }

  const totalEarned = deliveries.reduce((s, d) => s + (d.delivery_fee || 0) + (d.tip || 0), 0);
  const inputClass = "w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 mt-1";

  return (
    <div className="bg-surface-950 min-h-full">
      <div className="px-4 pt-5 pb-4"><h1 className="text-xl font-bold text-white">Earnings</h1></div>
      <div className="px-4 mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
          <p className="text-xs text-white/70 mb-1">Wallet Balance</p>
          <p className="text-2xl font-bold text-white">₦{(profile?.wallet_balance || 0).toLocaleString()}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
          <p className="text-xs text-white/70 mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-white">₦{totalEarned.toLocaleString()}</p>
        </div>
      </div>
      <div className="px-4 mb-5">
        {!withdrawing ? (
          <button onClick={() => setWithdrawing(true)} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"><ArrowUpRight className="w-5 h-5" /> Request Withdrawal</button>
        ) : (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <p className="font-semibold text-white">Withdrawal Request</p>
            {[{label:'Bank Name',field:'bank_name',placeholder:'e.g. GTBank'},{label:'Account Number',field:'account_number',placeholder:'0123456789'},{label:'Account Name',field:'account_name',placeholder:'Full name on account'}].map(({ label, field, placeholder }) => (
              <div key={field}><label className="text-xs font-medium text-gray-400">{label}</label><input value={form[field]} onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))} placeholder={placeholder} className={inputClass} /></div>
            ))}
            <div><label className="text-xs font-medium text-gray-400">Amount (₦)</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Min ₦500" className={inputClass} /></div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {success && <p className="text-xs text-green-400">Withdrawal request submitted! Processed within 24–48 hours.</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setWithdrawing(false)} className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-2.5 rounded-xl text-sm">Cancel</button>
              <button onClick={requestWithdrawal} className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm">Submit</button>
            </div>
          </div>
        )}
      </div>
      <div className="px-4">
        <p className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-brand-400" /> Completed Deliveries</p>
        {deliveries.length === 0 ? (
          <div className="text-center py-8"><div className="w-12 h-12 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-3"><Wallet className="w-6 h-6 text-gray-600" /></div><p className="text-sm text-gray-500">No completed deliveries yet</p></div>
        ) : (
          <div className="space-y-2 mb-5">
            {deliveries.map(d => (
              <div key={d.id} className="bg-surface-900 border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-green-500/15 rounded-full flex items-center justify-center shrink-0"><TrendingUp className="w-4 h-4 text-green-400" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-white truncate">{d.pickup_location} → {d.dropoff_location}</p><p className="text-xs text-gray-500">{d.delivered_at ? formatDistanceToNow(new Date(d.delivered_at), { addSuffix: true }) : ''}</p></div>
                <div className="text-right"><p className="text-sm font-bold text-green-400">+₦{((d.delivery_fee || 0) + (d.tip || 0)).toLocaleString()}</p>{d.tip > 0 && <p className="text-xs text-gray-500">+₦{d.tip} tip</p>}</div>
              </div>
            ))}
          </div>
        )}
        {withdrawals.length > 0 && (
          <div className="mb-5">
            <p className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5"><Clock className="w-4 h-4 text-gray-400" /> Withdrawal History</p>
            <div className="space-y-2">
              {withdrawals.map(w => (
                <div key={w.id} className="bg-surface-900 border border-white/[0.08] rounded-xl p-3 flex justify-between items-center">
                  <div><p className="text-sm font-medium text-white">{w.bank_name} — {w.account_number}</p><p className="text-xs text-gray-500">{formatDistanceToNow(new Date(w.created_at), { addSuffix: true })}</p></div>
                  <div className="text-right"><p className="text-sm font-bold text-white">₦{w.amount?.toLocaleString()}</p><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${w.status === 'paid' ? 'bg-green-500/15 text-green-400' : w.status === 'rejected' ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>{w.status}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="h-4" />
    </div>
  );
}
