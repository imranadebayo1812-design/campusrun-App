import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { ShoppingBag, Banknote, MapPin, Wallet, AlertTriangle, Mail, Lock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ── WithdrawModal ─────────────────────────────────────────────────────────────

function WithdrawModal({ title, maxAmount, isEarnings, type, onSuccess, onClose }) {
  const [dest, setDest]               = useState('wallet');
  const [banks, setBanks]             = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [banksError, setBanksError] = useState('');
  const [bankCode, setBankCode]       = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedName, setVerifiedName]   = useState('');
  const [verifying, setVerifying]     = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [amount, setAmount]           = useState('');
  const [error, setError]             = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);
  const [confirmed, setConfirmed]     = useState(null);

  const amt        = parseFloat(amount) || 0;
  const commission = isEarnings ? Math.round(amt * 0.15) : 0;
  const net        = amt - commission;

  // Load Nigerian banks when "To Bank" tab is first opened
  useEffect(() => {
    if (dest !== 'bank' || banks.length > 0) return;
    setBanksLoading(true);
    setBanksError('');
    supabase.functions.invoke('list-banks')
      .then(({ data, error }) => {
        if (error || !data?.data?.length) {
          setBanksError('Could not load bank list. Try again.');
        } else {
          setBanks(data.data);
        }
      })
      .catch(() => setBanksError('Could not load bank list. Check your connection.'))
      .finally(() => setBanksLoading(false));
  }, [dest]);

  // Reset verification whenever bank or account number changes
  useEffect(() => {
    setVerifiedName('');
    setVerifyError('');
  }, [bankCode, accountNumber]);

  async function verifyAccount() {
    if (!bankCode)                    { setVerifyError('Select a bank'); return; }
    if (accountNumber.length !== 10)  { setVerifyError('Account number must be 10 digits'); return; }
    setVerifying(true);
    setVerifyError('');

    const { data, error: fnErr } = await supabase.functions.invoke('verify-account', {
      body: { bank_code: bankCode, account_number: accountNumber },
    });
    setVerifying(false);

    if (fnErr || !data?.status) {
      setVerifyError(data?.message ?? 'Could not verify. Check details and try again.');
      return;
    }
    setVerifiedName(data.data.account_name);
  }

  async function submit() {
    setError('');
    if (!amt || amt < 500)     { setError('Minimum withdrawal is ₦500'); return; }
    if (amt > maxAmount)       { setError(`Max is ₦${maxAmount.toLocaleString()}`); return; }
    if (dest === 'bank' && !verifiedName) { setError('Verify your bank account first'); return; }

    setSubmitting(true);

    if (dest === 'wallet') {
      const { error: rpcErr } = await supabase.rpc('transfer_earnings_to_wallet', {
        p_amount: amt,
        p_type:   type,
      });
      setSubmitting(false);
      if (rpcErr) { setError('Transfer failed: ' + rpcErr.message); return; }
    } else {
      const selectedBank = banks.find(b => b.code === bankCode);
      const { data, error: fnErr } = await supabase.functions.invoke('initiate-payout', {
        body: {
          amount,
          type,
          bank_code:      bankCode,
          account_number: accountNumber,
          account_name:   verifiedName,
          bank_name:      selectedBank?.name ?? '',
        },
      });
      setSubmitting(false);
      if (fnErr || !data?.success) {
        setError(data?.error ?? 'Transfer failed. Please try again or contact support.');
        return;
      }
    }

    const result = { amt, net, dest };
    setConfirmed(result);
    onSuccess(result);
    setDone(true);
  }

  const inputClass = 'w-full bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50';

  return (
    <div
      className="fixed inset-x-0 top-0 z-[200] flex items-end justify-center"
      style={{ height: '100dvh', backgroundColor: 'rgba(0,0,0,0.7)' }}
    >
      <div className="w-full max-w-md bg-surface-900 border border-white/[0.08] rounded-t-3xl p-5 space-y-4"
        style={{ maxHeight: '90dvh', overflowY: 'auto', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between">
          <p className="font-bold text-white text-base">{title}</p>
          <button onClick={onClose} className="text-gray-400 text-xl font-bold leading-none">×</button>
        </div>

        {done && confirmed ? (
          /* ── Success state ── */
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-7 h-7 text-green-400" />
            </div>
            {confirmed.dest === 'wallet' ? (
              <>
                <p className="text-green-400 font-bold text-base">Added to wallet!</p>
                <p className="text-gray-400 text-sm mt-1">
                  ₦{confirmed.net.toLocaleString()} is now in your CampusRun wallet.
                  {isEarnings && (
                    <span className="text-gray-500"> (₦{(confirmed.amt - confirmed.net).toLocaleString()} commission deducted)</span>
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="text-green-400 font-bold text-base">Transfer initiated!</p>
                <p className="text-gray-400 text-sm mt-1">
                  ₦{confirmed.net.toLocaleString()} is on its way to your bank account.
                  {isEarnings && <span className="text-gray-500"> (15% commission deducted)</span>}
                </p>
                <p className="text-gray-500 text-xs mt-2">Funds typically arrive within 1–2 business days.</p>
              </>
            )}
            <button
              onClick={onClose}
              className="mt-5 bg-brand-500 text-white px-8 py-2.5 rounded-xl text-sm font-semibold"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* ── Destination toggle ── */}
            <div className="flex gap-2">
              {[
                { value: 'wallet', label: 'To Wallet', Icon: Wallet },
                { value: 'bank',   label: 'To Bank',   Icon: Banknote },
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

            {/* ── Wallet info ── */}
            {dest === 'wallet' && (
              <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3">
                <p className="text-xs text-brand-400 font-semibold">Instant · No bank charges</p>
                <p className="text-xs text-brand-400/70 mt-0.5">
                  Amount credited to your CampusRun wallet immediately.
                </p>
              </div>
            )}

            {/* ── Bank fields ── */}
            {dest === 'bank' && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5">Bank</label>
                  {banksLoading ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                      <div className="w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                      Loading banks…
                    </div>
                  ) : banksError ? (
                    <p className="text-xs text-red-400 py-2">{banksError}</p>
                  ) : (
                    <select
                      value={bankCode}
                      onChange={e => setBankCode(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select bank…</option>
                      {banks.map(b => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-400 block mb-1.5">Account Number</label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit account number"
                      className={`flex-1 bg-surface-800 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50`}
                    />
                    <button
                      onClick={verifyAccount}
                      disabled={verifying || accountNumber.length !== 10 || !bankCode}
                      className="px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
                    >
                      {verifying ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : 'Verify'}
                    </button>
                  </div>
                </div>

                {verifyError && <p className="text-xs text-red-400">{verifyError}</p>}

                {verifiedName && (
                  <div className="flex items-center gap-2.5 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3">
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" aria-hidden="true" />
                    <p className="text-sm text-green-400 font-semibold">{verifiedName}</p>
                  </div>
                )}
              </>
            )}

            {/* ── Amount — shown after bank verified (or always for wallet) ── */}
            {(dest === 'wallet' || verifiedName) && (
              <div>
                <label className="text-xs font-medium text-gray-400 block mb-1.5">Amount (₦)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder={`Min ₦500 · Max ₦${maxAmount.toLocaleString()}`}
                  className={inputClass}
                />
              </div>
            )}

            {/* ── Commission breakdown ── */}
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
              <button
                onClick={onClose}
                className="flex-1 bg-surface-800 border border-white/[0.08] text-gray-400 font-medium py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={
                  submitting ||
                  !amt ||
                  (dest === 'bank' && !verifiedName)
                }
                className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl text-sm disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? 'Processing…'
                  : dest === 'wallet'
                    ? 'Add to Wallet'
                    : 'Send to Bank'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PERIOD_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'all',   label: 'All Time' },
];

function withinHours(dateStr, hours) {
  return Date.now() - new Date(dateStr).getTime() < hours * 60 * 60 * 1000;
}

export default function CourierEarningsPage() {
  const { session, priceEditState } = useAuth();
  const [modal, setModal]           = useState(null); // 'earnings' | 'reimbursement'
  const [period, setPeriod]         = useState('today');
  const [earningsList, setEarningsList]       = useState([]);
  const [withdrawalsList, setWithdrawalsList] = useState([]);

  const pendingVerification = priceEditState.pendingVerificationAmount;

  // ── Load earnings + withdrawals ───────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    let channel;

    async function load() {
      const [{ data: earnings }, { data: withdrawals }] = await Promise.all([
        supabase
          .from('courier_earnings')
          .select('*, deliveries(pickup_location, dropoff_location, food_cost)')
          .eq('courier_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('courier_withdrawals')
          .select('*')
          .eq('courier_id', userId),
      ]);
      setEarningsList(earnings ?? []);
      setWithdrawalsList(withdrawals ?? []);

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

  // ── Derive totals ─────────────────────────────────────────
  const earned = earningsList
    .filter(e => ['delivery_fee', 'tip'].includes(e.type))
    .reduce((s, e) => s + e.amount, 0);

  const foodReimbursed = earningsList
    .filter(e => e.type === 'reimbursement')
    .reduce((s, e) => s + e.amount, 0);

  const frozen = earningsList.some(e => e.status === 'frozen');

  const withdrawnEarnings = withdrawalsList
    .filter(w => w.type === 'earnings' && ['processing', 'completed'].includes(w.status))
    .reduce((s, w) => s + w.gross_amount, 0);

  const withdrawnReimbursement = withdrawalsList
    .filter(w => w.type === 'reimbursement' && ['processing', 'completed'].includes(w.status))
    .reduce((s, w) => s + w.gross_amount, 0);

  const availableEarnings      = Math.max(0, earned - withdrawnEarnings);
  const availableReimbursement = Math.max(0, foodReimbursed - withdrawnReimbursement);

  // ── Group earnings by delivery for history ────────────────
  const groupedHistory = Object.values(
    earningsList.reduce((acc, entry) => {
      const did = entry.delivery_id || entry.id;
      if (!acc[did]) acc[did] = {
        id: did,
        pickup_location:  entry.deliveries?.pickup_location  || '—',
        dropoff_location: entry.deliveries?.dropoff_location || '—',
        delivery_fee: 0,
        food_cost:    0,
        created_at:   entry.created_at,
      };
      if (['delivery_fee', 'tip'].includes(entry.type)) acc[did].delivery_fee += entry.amount;
      else if (entry.type === 'reimbursement')           acc[did].food_cost    += entry.amount;
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filteredHistory = groupedHistory.filter(entry => {
    if (period === 'today') return withinHours(entry.created_at, 24);
    if (period === 'week')  return withinHours(entry.created_at, 24 * 7);
    return true;
  });

  function handleWithdrawSuccess() {
    // Reload withdrawals so available balances update
    if (!session?.user?.id) return;
    supabase
      .from('courier_withdrawals')
      .select('*')
      .eq('courier_id', session.user.id)
      .then(({ data }) => setWithdrawalsList(data ?? []));
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
          <p className="text-4xl font-bold text-white mb-3">₦{availableReimbursement.toLocaleString()}</p>
          <div className="flex gap-4 text-xs text-white/70 flex-wrap">
            <span>Total: <strong className="text-white">₦{foodReimbursed.toLocaleString()}</strong></span>
            <span>Withdrawn: <strong className="text-white">₦{withdrawnReimbursement.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Delivery Earnings card */}
        <div className="rounded-2xl p-5 overflow-hidden shadow-lg shadow-black/30" style={{ background: 'linear-gradient(135deg, #00d1ff 0%, #0080ff 100%)', boxShadow: '0 0 28px rgba(0,209,255,0.25)' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Delivery Earnings</p>
            <span className="text-xs bg-white/20 text-white font-semibold px-2.5 py-1 rounded-full">15% COMMISSION</span>
          </div>
          <p className="text-4xl font-bold text-white mb-3">₦{availableEarnings.toLocaleString()}</p>
          <div className="flex gap-4 text-xs text-white/70 flex-wrap">
            <span>Earned: <strong className="text-white">₦{earned.toLocaleString()}</strong></span>
            <span>Withdrawn: <strong className="text-white">₦{withdrawnEarnings.toLocaleString()}</strong></span>
          </div>
        </div>

        {/* Pending verification */}
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
              </p>
            </div>
          </div>
        )}

        {/* Withdraw buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setModal('reimbursement')}
            disabled={frozen || availableReimbursement === 0}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)' }}
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            Withdraw Reimbursement
          </button>
          <button
            onClick={() => setModal('earnings')}
            disabled={frozen || availableEarnings === 0}
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #00d1ff 0%, #0080ff 100%)', boxShadow: '0 0 16px rgba(0,209,255,0.3)' }}
          >
            <Banknote className="w-4 h-4" aria-hidden="true" />
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
                  <MapPin className="w-4 h-4 text-brand-400" aria-hidden="true" />
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
          type="reimbursement"
          onSuccess={handleWithdrawSuccess}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'earnings' && (
        <WithdrawModal
          title="Withdraw Earnings"
          maxAmount={availableEarnings}
          isEarnings={true}
          type="earnings"
          onSuccess={handleWithdrawSuccess}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
