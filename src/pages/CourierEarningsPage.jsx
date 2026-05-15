import { useState } from 'react';
import { MOCK_EARNINGS } from '@/lib/mockData';
import { ShoppingBag, Banknote } from 'lucide-react';

function WithdrawModal({ title, maxAmount, onClose }) {
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    const amt = parseFloat(amount);
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

export default function CourierEarningsPage() {
  const [modal, setModal] = useState(null); // 'reimbursement' | 'earnings' | null

  const e = MOCK_EARNINGS;

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-5">
        <h1 className="text-xl font-bold text-white">My Wallet</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track earnings and request payouts</p>
      </div>

      <div className="px-4 space-y-3">
        {/* Purchase Reimbursement card (green) */}
        <div className="rounded-2xl p-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
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
        <div className="rounded-2xl p-5 overflow-hidden" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
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

      <div className="h-6" />

      {modal === 'reimbursement' && (
        <WithdrawModal
          title="Withdraw Reimbursement"
          maxAmount={e.food_reimbursed}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'earnings' && (
        <WithdrawModal
          title="Withdraw Earnings"
          maxAmount={e.this_week}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
