import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ensurePaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TX_ICON = {
  topup:      { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/15' },
  earning:    { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/15' },
  tip:        { icon: ArrowDownLeft, color: 'text-green-400', bg: 'bg-green-500/15' },
  refund:     { icon: ArrowDownLeft, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  payment:    { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/15' },
  withdrawal: { icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/15' },
};

export default function WalletPage() {
  const { session, profile, refreshProfile } = useAuth();
  const [topupAmount, setTopupAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: transactions = [] } = useQuery({
    queryKey: ['wallet-transactions', session?.user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  async function topUp() {
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 100) {
      setError('Minimum top-up is ₦100');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const PaystackPop = await ensurePaystack();
      const ref = `WALLET-${session.user.id.slice(0, 8)}-${Date.now()}`;
      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: session.user.email,
        amount: Math.round(amount * 100),
        currency: 'NGN',
        ref,
        onSuccess: async () => {
          await fetch('/api/wallet/topup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id, amount, reference: ref }),
          });
          await refreshProfile();
          setTopupAmount('');
          setLoading(false);
        },
        onCancel: () => { setLoading(false); },
      });
      handler.openIframe();
    } catch {
      setError('Could not load payment.');
      setLoading(false);
    }
  }

  const balance = profile?.wallet_balance || 0;

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <h1 className="text-xl font-bold text-white">Wallet</h1>
      </div>

      {/* Balance card */}
      <div className="mx-4 mb-5">
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #2563eb 100%)' }}
        >
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-8 w-16 h-16 rounded-full bg-white/[0.07]" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-white/70" />
              <p className="text-white/70 text-sm">Available Balance</p>
            </div>
            <p className="text-4xl font-bold text-white">₦{balance.toLocaleString()}</p>
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
            onChange={e => setTopupAmount(e.target.value)}
            placeholder="Custom amount"
            className="flex-1 bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
          <button
            onClick={topUp}
            disabled={loading}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold px-4 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" />
            {loading ? '…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* Transactions */}
      <div className="px-4">
        <p className="text-sm font-semibold text-white mb-3">Transactions</p>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-surface-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
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
                    <p className="text-xs text-gray-600">₦{tx.balance_after?.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}
