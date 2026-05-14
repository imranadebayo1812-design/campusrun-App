import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ensurePaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const TX_ICON = {
  topup: { icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-100' },
  earning: { icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-100' },
  tip: { icon: ArrowDownLeft, color: 'text-green-600', bg: 'bg-green-100' },
  refund: { icon: ArrowDownLeft, color: 'text-blue-600', bg: 'bg-blue-100' },
  payment: { icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-100' },
  withdrawal: { icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-100' },
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
          await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/wallet/topup`, {
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
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Wallet</h1>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5 opacity-80" />
          <p className="text-sm opacity-80">Available Balance</p>
        </div>
        <p className="text-4xl font-bold">₦{balance.toLocaleString()}</p>
      </div>

      {/* Top up */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">
        <p className="text-sm font-semibold text-gray-700">Top Up Wallet</p>
        <div className="flex gap-2">
          {[500, 1000, 2000, 5000].map(amt => (
            <button
              key={amt}
              onClick={() => setTopupAmount(String(amt))}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                topupAmount == amt ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600'
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
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          <button
            onClick={topUp}
            disabled={loading}
            className="flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-4 rounded-xl text-sm"
          >
            <Plus className="w-4 h-4" />
            {loading ? '…' : 'Add'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      {/* Transactions */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Transactions</p>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const { icon: Icon, color, bg } = TX_ICON[tx.type] || TX_ICON.payment;
              const isCredit = ['topup', 'earning', 'tip', 'refund'].includes(tx.type);
              return (
                <div key={tx.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                  <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{tx.description || tx.type}</p>
                    <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}₦{Math.abs(tx.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">₦{tx.balance_after?.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
