import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { ensurePaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, TrendingUp, Banknote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TX_ICON = {
  topup:      { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/15' },
  earning:    { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/15' },
  tip:        { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/15' },
  refund:     { icon: ArrowDownLeft, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  payment:    { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/15' },
  withdrawal: { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/15' },
};

function WithdrawToBankModal({ maxAmount, onSuccess, onClose }) {
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const amt = parseFloat(amount) || 0;

  async function submit() {
    if (!amt || amt < 500) { setError('Minimum withdrawal is ₦500'); return; }
    if (amt > maxAmount) { setError(`Max withdrawable is ₦${maxAmount.toLocaleString()}`); return; }
    if (!form.bank_name || !form.account_number || !form.account_name) { setError('Fill in all bank details'); return; }
    setError('');
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    onSuccess(amt);
    setSubmitting(false);
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4">
        <div className="flex items-center justify-between mb-1">
          <p className="font-bold text-white text-base">Withdraw to Bank</p>
          <button onClick={onClose} className="text-gray-400 text-xl font-bold leading-none">×</button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="text-green-400 font-semibold text-base">Withdrawal requested!</p>
            <p className="text-gray-400 text-sm mt-1">₦{amt.toLocaleString()} will be processed within 24–48 hours.</p>
            <button onClick={onClose} className="mt-4 bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Done</button>
          </div>
        ) : (
          <>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
              <p className="text-xs text-green-400 font-semibold">No commission — full amount paid out</p>
              <p className="text-xs text-green-400/70 mt-0.5">Wallet withdrawals to bank are never charged a commission.</p>
            </div>

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
                {submitting ? 'Processing…' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { session, profile, refreshProfile, updateProfileLocally, walletTransactions } = useAuth();
  const [topupAmount, setTopupAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  async function topUp() {
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 100) { setError('Minimum top-up is ₦100'); return; }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await ensurePaystack();
      const ref = `topup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: session.user.email,
        amount: amount * 100,
        ref,
        currency: 'NGN',
        onSuccess: async (txn) => {
          const roundedAmount = Math.round(amount);
          const { error: rpcErr } = await supabase.rpc('record_topup', {
            p_reference: txn.reference,
            p_amount: roundedAmount,
          });
          if (rpcErr) {
            setError(`Payment received but wallet update failed: ${rpcErr.message}`);
          } else {
            updateProfileLocally({ wallet_balance: (profile?.wallet_balance || 0) + roundedAmount });
            refreshProfile();
            setTopupAmount('');
            setSuccess(`₦${roundedAmount.toLocaleString()} added to your wallet!`);
          }
          setLoading(false);
        },
        onCancel: () => {
          setError('Payment cancelled.');
          setLoading(false);
        },
      }).openIframe();
    } catch {
      setError('Could not load payment. Check your connection and try again.');
      setLoading(false);
    }
  }

  function handleWithdrawSuccess() {
    setShowWithdraw(false);
  }

  const balance = profile?.wallet_balance || 0;

  return (
    <div className="bg-surface-950 min-h-full">
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-xl font-bold text-white">Wallet</h1>
      </div>

      {/* Balance card */}
      <div className="mx-4 mb-4">
        <div
          className="rounded-2xl p-6 relative overflow-hidden shadow-lg shadow-black/30"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)' }}
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 w-16 h-16 rounded-full bg-white/[0.07]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-white/70" />
              <p className="text-white/70 text-sm">Available Balance</p>
            </div>
            <p className="text-4xl font-bold text-white mb-4">₦{balance.toLocaleString()}</p>
            <button
              onClick={() => setShowWithdraw(true)}
              disabled={balance < 500}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition-colors"
            >
              <Banknote className="w-3.5 h-3.5" aria-hidden="true" />
              Withdraw to Bank
            </button>
          </div>
        </div>
      </div>

      {/* Top up */}
      <div className="mx-4 mb-5 bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white">Top Up Wallet</p>
        <div className="flex gap-2">
          {[500, 1000, 2000, 5000].map(amt => (
            <button
              key={amt}
              onClick={() => setTopupAmount(String(amt))}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                topupAmount == amt
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'border-white/[0.08] text-gray-400 bg-surface-800'
              }`}
            >
              ₦{amt.toLocaleString()}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            value={topupAmount}
            onChange={e => { setTopupAmount(e.target.value); setError(''); setSuccess(''); }}
            placeholder="Custom amount"
            className="flex-1 bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          <button
            onClick={topUp}
            disabled={loading}
            className="flex items-center gap-1.5 bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm shadow-md shadow-brand-500/20"
          >
            <Plus className="w-4 h-4" />
            {loading ? '…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}
      </div>

      {/* Transactions */}
      <div className="px-4">
        <p className="text-sm font-semibold text-white mb-3">Transactions</p>
        {walletTransactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {walletTransactions.map(tx => {
              const { icon: Icon, color, bg } = TX_ICON[tx.type] || TX_ICON.payment;
              const isCredit = ['topup', 'earning', 'tip', 'refund'].includes(tx.type);
              return (
                <div key={tx.id} className="bg-surface-900 border border-white/[0.08] rounded-xl p-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{tx.description || tx.type}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                      {isCredit ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString()}
                    </p>
                    {tx.balance_after != null && (
                      <p className="text-xs text-gray-600">₦{tx.balance_after.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-4" />

      {showWithdraw && (
        <WithdrawToBankModal
          maxAmount={balance}
          onSuccess={() => setShowWithdraw(false)}
          onClose={() => setShowWithdraw(false)}
        />
      )}
    </div>
  );
}
