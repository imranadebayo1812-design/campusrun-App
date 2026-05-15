import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MOCK_EARNINGS, MOCK_EARNING_HISTORY } from '@/lib/mockData';
import { TrendingUp, Wallet, ArrowUpRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function CourierEarningsPage() {
  const { profile } = useAuth();
  const [withdrawing, setWithdrawing] = useState(false);
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [amount, setAmount] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function requestWithdrawal() {
    const amt = parseFloat(amount);
    if (!amt || amt < 500) { setError('Minimum withdrawal is ₦500'); return; }
    if (!form.bank_name || !form.account_number || !form.account_name) { setError('Fill in all bank details'); return; }

    setError('');
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setSuccess(true);
    setWithdrawing(false);
  }

  const inputClass = "w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 mt-1";

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-xl font-bold text-white">Earnings</h1>
      </div>

      {/* Stats */}
      <div className="px-4 mb-5 grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
        >
          <p className="text-xs text-white/70 mb-1">Today</p>
          <p className="text-2xl font-bold text-white">₦{MOCK_EARNINGS.today.toLocaleString()}</p>
          <p className="text-xs text-white/60 mt-0.5">{MOCK_EARNINGS.deliveries_today} deliveries</p>
        </div>
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}
        >
          <p className="text-xs text-white/70 mb-1">This Week</p>
          <p className="text-2xl font-bold text-white">₦{MOCK_EARNINGS.this_week.toLocaleString()}</p>
          <p className="text-xs text-white/60 mt-0.5">{MOCK_EARNINGS.deliveries_week} deliveries</p>
        </div>
      </div>

      {/* Total earnings banner */}
      <div className="mx-4 mb-5 bg-surface-900 border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">All-Time Earnings</p>
          <p className="text-xl font-bold text-white">₦{MOCK_EARNINGS.total.toLocaleString()}</p>
        </div>
        <div className="w-10 h-10 bg-brand-500/15 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-brand-400" />
        </div>
      </div>

      {/* Withdraw button */}
      <div className="px-4 mb-5">
        {success && (
          <div className="mb-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <p className="text-xs text-green-400">Withdrawal request submitted! Processed within 24–48 hours.</p>
          </div>
        )}
        {!withdrawing ? (
          <button
            onClick={() => { setWithdrawing(true); setSuccess(false); }}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"
          >
            <ArrowUpRight className="w-5 h-5" /> Request Withdrawal
          </button>
        ) : (
          <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-3">
            <p className="font-semibold text-white">Withdrawal Request</p>
            {[
              { label: 'Bank Name', field: 'bank_name', placeholder: 'e.g. GTBank' },
              { label: 'Account Number', field: 'account_number', placeholder: '0123456789' },
              { label: 'Account Name', field: 'account_name', placeholder: 'Full name on account' },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="text-xs font-medium text-gray-400">{label}</label>
                <input
                  value={form[field]}
                  onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className={inputClass}
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-400">Amount (₦)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Min ₦500"
                className={inputClass}
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setWithdrawing(false)}
                className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-2.5 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={requestWithdrawal}
                disabled={submitting}
                className="flex-1 bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Completed deliveries */}
      <div className="px-4">
        <p className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-brand-400" /> Recent Deliveries
        </p>
        <div className="space-y-2 mb-5">
          {MOCK_EARNING_HISTORY.map(d => (
            <div key={d.id} className="bg-surface-900 border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-green-500/15 rounded-full flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {d.pickup_location} → {d.dropoff_location}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-400">
                  +₦{(d.delivery_fee).toLocaleString()}
                </p>
                {d.food_cost > 0 && (
                  <p className="text-xs text-gray-500">+₦{d.food_cost.toLocaleString()} reimb.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-4" />
    </div>
  );
}
