import { useState } from 'react';
import { MOCK_EARNINGS, MOCK_EARNING_HISTORY } from '@/lib/mockData';
import { ShoppingBag, Banknote, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function WithdrawModal({ title, maxAmount, isEarnings, onClose }) {
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const amt = parseFloat(amount) || 0;
  const tax = isEarnings ? Math.round(amt * 0.15) : 0;
  const net = amt - tax;

  async function submit() {
    if (!amt || amt < 500) { setError('Minimum withdrawal is ₦500'); return; }
    if (amt > maxAmount) { setError(`Max withdrawable is ₦${maxAmount.toLocaleString()}`); return; }
    if (!form.bank_name || !form.account_number || !form.account_name) { setError('Fill in all bank details'); return; }
    setError('');
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-white text-base">{title}</p>
          <button onClick={onClose} className="text-gray-400 text-xl font-bold leading-none">×</button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="text-green-400 font-semibold text-base">Request submitted!</p>
            <p className="text-gray-400 text-sm mt-1">Processed within 24–48 hours.</p>
            <button onClick={onClose} className="mt-4 bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Done</button>
          </div>
        ) : (
          <>
            {[
              { label: 'Bank Name', field: 'bank_name', placeholder: 'e.g. GTBank' },
              { label: 'Account Number', field: 'account_number', placeholder: '0123456789' },
              { label: 'Account Name', field: 'account_name', placeholder: 'Full name on account' },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="text-xs font-medium text-gray-400 block mb-1">{label}</label>
                <input
                  value={form[field]}
                  onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-gray-400 block mb-1">Amount (₦)</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={`Min ₦500 · Max ₦${maxAmount.toLocaleString()}`}
                className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>

            {/* Tax breakdown for earnings; no-deduction note for reimbursement */}
            {isEarnings && amt > 0 ? (
              <div className="bg-surface-800 border border-white/[0.08] rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Withdrawal</span>
                  <span className="text-white font-medium">₦{amt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tax (15%)</span>
                  <span className="text-red-400 font-medium">−₦{tax.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/[0.08] pt-2 flex justify-between text-sm">
                  <span className="text-white font-semibold">You receive</span>
                  <span className="text-green-400 font-bold">₦{net.toLocaleString()}</span>
                </div>
              </div>
            ) : !isEarnings ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <p className="text-xs text-green-400 font-medium">No deductions — full amount paid out</p>
              </div>
            ) : null}

            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={submit} disabled={submitting} className="flex-1 bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const PERIOD_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'all', label: 'All Time' },
];

function withinHours(dateStr, hours) {
  return Date.now() - new Date(dateStr).getTime() < hours * 60 * 60 * 1000;
}

export default function CourierEarningsPage() {
  const [modal, setModal] = useState(null); // 'reimbursement' | 'earnings' | null
  const [period, setPeriod] = useState('today');

  const e = MOCK_EARNINGS;

  const filteredHistory = MOCK_EARNING_HISTORY.filter(entry => {
    if (period === 'today') return withinHours(entry.created_at, 24);
    if (period === 'week') return withinHours(entry.created_at, 24 * 7);
    return true;
  });

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-5">
        <h1 className="text-xl font-bold text-white">My Wallet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your money, your pace.</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Purchase Reimbursement card (green) */}
        <div className="rounded-2xl p-5 overflow-hidden shadow-lg shadow-black/30" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Purchase Reimbursement</p>
            <span className="text-xs bg-white/20 text-white font-semibold px-2.5 py-1 rounded-full">
              WITHDRAWABLE · NO COMMISSION
            </span>
          </div>
          <p className="text-4xl font-bold text-white mb-3">₦{e.food_reimbursed.toLocaleString()}</p>
          <div className="flex gap-4 text-xs text-white/70">
            <span>Total food spent: <strong className="text-white">₦{(e.food_reimbursed + 800).toLocaleString()}</strong></span>
            <span>Reimbursed: <strong className="text-white">₦{e.food_reimbursed.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Delivery Earnings card (purple) */}
        <div className="rounded-2xl p-5 overflow-hidden shadow-lg shadow-black/30" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
          <div className="flex items-start justify-between mb-4">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Delivery Earnings</p>
            <span className="text-xs bg-white/20 text-white font-semibold px-2.5 py-1 rounded-full">
              WITHDRAWABLE
            </span>
          </div>
          <p className="text-4xl font-bold text-white mb-3">₦{e.this_week.toLocaleString()}</p>
          <div className="flex gap-4 text-xs text-white/70 flex-wrap">
            <span>Earned: <strong className="text-white">₦{e.this_week.toLocaleString()}</strong></span>
            <span>Tips: <strong className="text-white">₦{e.tips.toLocaleString()}</strong></span>
            <span>Withdrawn: <strong className="text-white">₦{e.withdrawn.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Withdraw buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setModal('reimbursement')}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)' }}
          >
            <ShoppingBag className="w-4 h-4" />
            Withdraw Reimbursement
          </button>
          <button
            onClick={() => setModal('earnings')}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}
          >
            <Banknote className="w-4 h-4" />
            Withdraw Earnings
          </button>
        </div>
      </div>

      {/* Earnings breakdown */}
      <div className="px-4 mt-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">Delivery History</p>
          <div className="flex bg-surface-800 border border-white/[0.08] rounded-xl p-0.5 gap-0.5">
            {PERIOD_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setPeriod(f.key)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  period === f.key ? 'bg-brand-500 text-white' : 'text-gray-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Banknote className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No deliveries in this period</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredHistory.map(entry => (
              <div key={entry.id} className="bg-surface-900 border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-brand-500/15 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {entry.pickup_location} → {entry.dropoff_location}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-green-400">+₦{entry.delivery_fee.toLocaleString()}</p>
                  {entry.food_cost > 0 && (
                    <p className="text-xs text-gray-500">+₦{entry.food_cost.toLocaleString()} reimb.</p>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2 pb-1 border-t border-white/[0.06] px-1">
              <p className="text-xs text-gray-500 font-semibold">{filteredHistory.length} deliveries</p>
              <p className="text-sm font-bold text-white">
                ₦{filteredHistory.reduce((s, e) => s + e.delivery_fee, 0).toLocaleString()} total
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="h-6" />

      {modal === 'reimbursement' && (
        <WithdrawModal
          title="Withdraw Reimbursement"
          maxAmount={e.food_reimbursed}
          isEarnings={false}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'earnings' && (
        <WithdrawModal
          title="Withdraw Earnings"
          maxAmount={e.this_week}
          isEarnings={true}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
