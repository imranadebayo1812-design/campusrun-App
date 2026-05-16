import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { ShoppingBag, Banknote, MapPin, Wallet, AlertTriangle, Mail, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function WithdrawModal({ title, maxAmount, isEarnings, onSuccess, onClose }) {
  const [dest, setDest] = useState('wallet');
  const [form, setForm] = useState({ bank_name: '', account_number: '', account_name: '' });
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmed, setConfirmed] = useState({ amt: 0, net: 0, dest: 'wallet' });

  const amt = parseFloat(amount) || 0;
  const commission = isEarnings ? Math.round(amt * 0.15) : 0;
  const net = amt - commission;

  async function submit() {
    if (!amt || amt < 500) { setError('Minimum withdrawal is ₦500'); return; }
    if (amt > maxAmount) { setError(`Max withdrawable is ₦${maxAmount.toLocaleString()}`); return; }
    if (dest === 'bank' && (!form.bank_name || !form.account_number || !form.account_name)) {
      setError('Fill in all bank details');
      return;
    }
    setError('');
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    const result = { amt, net, dest };
    setConfirmed(result);
    onSuccess(result);
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
            {confirmed.dest === 'wallet' ? (
              <>
                <div className="w-12 h-12 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-brand-400" />
                </div>
                <p className="text-green-400 font-semibold text-base">Added to wallet!</p>
                <p className="text-gray-400 text-sm mt-1">
                  ₦{confirmed.net.toLocaleString()} added to your CampusRun wallet.
                  {isEarnings && (
                    <span className="text-gray-500"> (₦{(confirmed.amt - confirmed.net).toLocaleString()} commission deducted)</span>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="text-green-400 font-semibold text-base">Request submitted!</p>
                <p className="text-gray-400 text-sm mt-1">₦{confirmed.net.toLocaleString()} will be paid out within 24–48 hours.</p>
              </>
            )}
            <button onClick={onClose} className="mt-4 bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Done</button>
          </div>
        ) : (
          <>
            {/* Destination */}
            <div className="flex gap-2">
              {[
                { value: 'wallet', label: 'To Wallet', Icon: Wallet },
                { value: 'bank', label: 'To Bank', Icon: Banknote },
              ].map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => { setDest(value); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    dest === value
                      ? 'bg-brand-500 border-brand-500 text-white'
                      : 'border-white/[0.08] text-gray-400 bg-surface-800'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>

            {dest === 'wallet' && (
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3">
                <p className="text-xs text-brand-400 font-semibold">No bank transfer charges · Instant</p>
                <p className="text-xs text-brand-400/70 mt-0.5">Net amount added to your wallet — spend it on orders without re-transferring.</p>
              </div>
            )}

            {dest === 'bank' && [
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

            {/* Commission breakdown — earnings only */}
            {isEarnings && amt > 0 && (
              <div className="bg-surface-800 border border-white/[0.08] rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Withdrawal</span>
                  <span className="text-white font-medium">₦{amt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Commission (15%)</span>
                  <span className="text-red-400 font-medium">−₦{commission.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/[0.08] pt-2 flex justify-between text-sm">
                  <span className="text-white font-semibold">You receive</span>
                  <span className="text-green-400 font-bold">₦{net.toLocaleString()}</span>
                </div>
              </div>
            )}

            {!isEarnings && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
                <p className="text-xs text-green-400 font-medium">No deductions — full amount paid out</p>
              </div>
            )}

            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl text-sm">Cancel</button>
              <button onClick={submit} disabled={submitting} className="flex-1 bg-brand-500 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50">
                {submitting ? 'Processing…' : dest === 'wallet' ? 'Add to Wallet' : 'Submit Request'}
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
  const { session, profile, updateProfileLocally, addWalletTransaction, priceEditState } = useAuth();
  const [modal, setModal] = useState(null);
  const [period, setPeriod] = useState('today');
  const [earningsList, setEarningsList] = useState([]);
  const [withdrawnEarnings, setWithdrawnEarnings] = useState(0);
  const [withdrawnReimbursement, setWithdrawnReimbursement] = useState(0);

  const pendingVerification = priceEditState.pendingVerificationAmount;

  // ── Load earnings from DB ──────────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    let channel;

    async function load() {
      const { data } = await supabase
        .from('courier_earnings')
        .select('*, deliveries(pickup_location, dropoff_location, food_cost)')
        .eq('courier_id', userId)
        .order('created_at', { ascending: false });
      setEarningsList(data || []);

      channel = supabase.channel(`courier-earnings:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'courier_earnings',
          filter: `courier_id=eq.${userId}`,
        }, payload =>
          setEarningsList(prev =>
            prev.some(e => e.id === payload.new.id) ? prev : [payload.new, ...prev]
          )
        )
        .subscribe();
    }

    load();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [session?.user?.id]);

  // ── Derive totals ──────────────────────────────────────────
  const earned = earningsList
    .filter(e => ['delivery_fee', 'tip'].includes(e.type))
    .reduce((s, e) => s + e.amount, 0);

  const foodReimbursed = earningsList
    .filter(e => e.type === 'reimbursement')
    .reduce((s, e) => s + e.amount, 0);

  const frozen = earningsList.some(e => e.status === 'frozen');

  const availableEarnings = Math.max(0, earned - withdrawnEarnings);
  const availableReimbursement = Math.max(0, foodReimbursed - withdrawnReimbursement);

  // ── Group earnings by delivery for history display ─────────
  const groupedHistory = Object.values(
    earningsList.reduce((acc, entry) => {
      const did = entry.delivery_id || entry.id;
      if (!acc[did]) acc[did] = {
        id: did,
        pickup_location: entry.deliveries?.pickup_location || '—',
        dropoff_location: entry.deliveries?.dropoff_location || '—',
        delivery_fee: 0,
        food_cost: 0,
        created_at: entry.created_at,
      };
      if (['delivery_fee', 'tip'].includes(entry.type)) {
        acc[did].delivery_fee += entry.amount;
      } else if (entry.type === 'reimbursement') {
        acc[did].food_cost += entry.amount;
      }
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filteredHistory = groupedHistory.filter(entry => {
    if (period === 'today') return withinHours(entry.created_at, 24);
    if (period === 'week') return withinHours(entry.created_at, 24 * 7);
    return true;
  });

  function handleWithdrawSuccess({ amt, net, dest }, type) {
    if (type === 'earnings') {
      setWithdrawnEarnings(prev => prev + amt);
    } else {
      setWithdrawnReimbursement(prev => prev + amt);
    }

    if (dest === 'wallet') {
      const newBalance = (profile?.wallet_balance || 0) + net;
      addWalletTransaction({
        id: `tx-${Date.now()}`,
        user_id: session?.user?.id,
        type: 'earning',
        amount: net,
        balance_after: newBalance,
        description: type === 'earnings' ? 'Earnings transfer to wallet' : 'Reimbursement transfer to wallet',
        created_at: new Date().toISOString(),
      });
      updateProfileLocally({ wallet_balance: newBalance });
    }

    setModal(null);
  }

  return (
    <div className="bg-surface-950 min-h-full">
      <div className="px-4 pt-5 pb-5">
        <h1 className="text-xl font-bold text-white">My Earnings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your money, your pace.</p>
      </div>

      {/* Frozen earnings banner */}
      {frozen && (
        <div className="mx-4 mb-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-400">Earnings frozen</p>
              <p className="text-xs text-amber-400/80 mt-1">
                A reported issue is under review. Withdrawals are disabled until support resolves it.
              </p>
              <a
                href="mailto:support@campusrun.online"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-400 underline underline-offset-2"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                Contact support@campusrun.online
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 space-y-3">
        {/* Purchase Reimbursement card */}
        <div className="rounded-2xl p-5 overflow-hidden shadow-lg shadow-black/30" style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Purchase Reimbursement</p>
            <span className="text-xs bg-white/20 text-white font-semibold px-2.5 py-1 rounded-full">NO COMMISSION</span>
          </div>
          {/* Available (remaining) is the headline number */}
          <p className="text-4xl font-bold text-white mb-3">₦{availableReimbursement.toLocaleString()}</p>
          <div className="flex gap-4 text-xs text-white/70 flex-wrap">
            <span>Total: <strong className="text-white">₦{foodReimbursed.toLocaleString()}</strong></span>
            <span>Withdrawn: <strong className="text-white">₦{withdrawnReimbursement.toLocaleString()}</strong></span>
            <span>Remaining: <strong className="text-white">₦{availableReimbursement.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Delivery Earnings card */}
        <div className="rounded-2xl p-5 overflow-hidden shadow-lg shadow-black/30" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Delivery Earnings</p>
            <span className="text-xs bg-white/20 text-white font-semibold px-2.5 py-1 rounded-full">15% COMMISSION</span>
          </div>
          {/* Available (remaining) is the headline number */}
          <p className="text-4xl font-bold text-white mb-3">₦{availableEarnings.toLocaleString()}</p>
          <div className="flex gap-4 text-xs text-white/70 flex-wrap">
            <span>Earned: <strong className="text-white">₦{earned.toLocaleString()}</strong></span>
            <span>Withdrawn: <strong className="text-white">₦{withdrawnEarnings.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Pending verification card — price edit differences awaiting admin review */}
        {pendingVerification > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-amber-400">Pending Verification</p>
                <p className="text-lg font-bold text-amber-400">₦{pendingVerification.toLocaleString()}</p>
              </div>
              <p className="text-xs text-amber-400/70 mt-1">
                Price edit difference under admin review. Released once approved.
                Delivery fee and tips remain withdrawable normally.
              </p>
            </div>
          </div>
        )}

        {/* Withdraw buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setModal('reimbursement')}
            disabled={frozen || availableReimbursement === 0}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)' }}
          >
            <ShoppingBag className="w-4 h-4" />
            Withdraw Reimbursement
          </button>
          <button
            onClick={() => setModal('earnings')}
            disabled={frozen || availableEarnings === 0}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' }}
          >
            <Banknote className="w-4 h-4" />
            Withdraw Earnings
          </button>
        </div>
      </div>

      {/* Delivery History */}
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
          maxAmount={availableReimbursement}
          isEarnings={false}
          onSuccess={result => handleWithdrawSuccess(result, 'reimbursement')}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'earnings' && (
        <WithdrawModal
          title="Withdraw Earnings"
          maxAmount={availableEarnings}
          isEarnings={true}
          onSuccess={result => handleWithdrawSuccess(result, 'earnings')}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
