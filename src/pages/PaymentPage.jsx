import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';
import { ensurePaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { CreditCard, Wallet, ChevronLeft, CheckCircle } from 'lucide-react';

export default function PaymentPage() {
  const { deliveryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, session, updateProfileLocally } = useAuth();

  const delivery = location.state?.delivery;
  const [method, setMethod] = useState('paystack');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paid, setPaid] = useState(false);
  const pollRef = useRef(null);

  // Poll for payment_verified while loading (handles mobile where onSuccess doesn't fire)
  useEffect(() => {
    if (!loading) { clearInterval(pollRef.current); return; }
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('payment_verified')
        .eq('id', deliveryId)
        .single();
      if (data?.payment_verified) {
        clearInterval(pollRef.current);
        setLoading(false);
        setPaid(true);
      }
    }, 3000);
    const timeout = setTimeout(() => {
      clearInterval(pollRef.current);
      setLoading(false);
      setError('Payment verification timed out. If you were charged, your order is being confirmed.');
    }, 90000);
    return () => { clearInterval(pollRef.current); clearTimeout(timeout); };
  }, [loading, deliveryId]);
  const total = delivery?.total_amount || 0;
  const walletBalance = profile?.wallet_balance || 0;
  const canUseWallet = walletBalance >= total;

  async function handlePay() {
    setLoading(true);
    setError('');

    if (method === 'wallet') {
      if (!canUseWallet) {
        setError('Insufficient wallet balance.');
        setLoading(false);
        return;
      }
      const { error: rpcErr } = await supabase.rpc('pay_delivery_with_wallet', {
        p_delivery_id: deliveryId,
        p_user_id: session.user.id,
        p_amount: total,
      });
      if (rpcErr) {
        setError(rpcErr.message === 'insufficient_balance' ? 'Insufficient wallet balance.' : `Error: ${rpcErr.message}`);
        setLoading(false);
        return;
      }
      updateProfileLocally({ wallet_balance: walletBalance - total });
      setPaid(true);
      return;
    }

    if (method === 'paystack') {
      try {
        await ensurePaystack();
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: session.user.email,
          amount: total * 100,
          ref: `cr_${deliveryId}_${Date.now()}`,
          metadata: { type: 'delivery_payment', delivery_id: deliveryId },
          onSuccess: async () => {
            await supabase.from('deliveries')
              .update({ payment_verified: true, payment_method: 'paystack' })
              .eq('id', deliveryId);
            setLoading(false);
            setPaid(true);
          },
          onCancel: async () => {
            // On mobile, Paystack sometimes fires onCancel even after a
            // successful payment. Re-check the DB before treating as cancelled.
            const { data } = await supabase
              .from('deliveries')
              .select('payment_verified')
              .eq('id', deliveryId)
              .single();
            if (data?.payment_verified) {
              setPaid(true);
            } else {
              setLoading(false);
            }
          },
        });
        handler.openIframe();
        return;
      } catch (err) {
        setError('Could not load payment provider. Check your connection.');
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  }

  if (paid) return (
    <div className="bg-surface-950 min-h-full flex flex-col items-center justify-center px-6 text-center gap-5">
      <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-green-400" />
      </div>
      <div>
        <p className="text-xl font-bold text-white">Order placed!</p>
        <p className="text-sm text-gray-400 mt-1">Your order is confirmed. A runner will pick it up shortly.</p>
      </div>
      <button
        onClick={() => navigate(`/track/${deliveryId}`, { replace: true })}
        className="w-full max-w-xs bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20"
      >
        Track Order
      </button>
      <button
        onClick={() => navigate('/orders', { replace: true })}
        className="text-sm text-gray-500"
      >
        View all orders
      </button>
    </div>
  );

  if (!delivery) {
    return (
      <div className="p-4 text-center text-gray-500 pt-20">
        <p>Order not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-950 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-surface-900 border border-white/[0.08] rounded-xl flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h1 className="text-lg font-bold text-white">Payment</h1>
      </div>

      <div className="px-4 space-y-5 pb-6">
        {/* Order summary */}
        <div className="bg-surface-900 border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold text-white mb-1">Order Summary</p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">From</span>
            <span className="font-medium text-white">{delivery.pickup_location}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">To</span>
            <span className="font-medium text-white">{delivery.dropoff_location}</span>
          </div>
          {delivery.food_cost > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Food cost</span>
              <span className="text-white">₦{delivery.food_cost.toLocaleString()}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Delivery fee</span>
            <span className="text-white">₦{delivery.delivery_fee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Service fee</span>
            <span className="text-white">₦{delivery.service_fee.toLocaleString()}</span>
          </div>
          <div className="border-t border-white/[0.08] pt-3 flex justify-between font-bold">
            <span className="text-white">Total</span>
            <span className="text-brand-400 text-lg">₦{total.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment method */}
        <div>
          <p className="text-sm font-semibold text-white mb-3">Payment Method</p>
          <div className="space-y-2">
            <button
              onClick={() => setMethod('paystack')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                method === 'paystack'
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-white/[0.08] bg-surface-900'
              }`}
            >
              <CreditCard className={`w-5 h-5 ${method === 'paystack' ? 'text-brand-400' : 'text-gray-500'}`} />
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">Card / Bank Transfer</p>
                <p className="text-xs text-gray-500">Powered by Paystack</p>
              </div>
              {method === 'paystack' && <CheckCircle className="w-5 h-5 text-brand-400" />}
            </button>

            <button
              onClick={() => canUseWallet && setMethod('wallet')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                !canUseWallet
                  ? 'opacity-40 cursor-not-allowed border-white/[0.08] bg-surface-900'
                  : method === 'wallet'
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-white/[0.08] bg-surface-900'
              }`}
            >
              <Wallet className={`w-5 h-5 ${method === 'wallet' ? 'text-green-400' : 'text-gray-500'}`} />
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">Wallet</p>
                <p className="text-xs text-gray-500">
                  Balance: ₦{walletBalance.toLocaleString()}
                  {!canUseWallet && ' — insufficient funds'}
                </p>
              </div>
              {method === 'wallet' && <CheckCircle className="w-5 h-5 text-green-400" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          className="w-full bg-gradient-to-br from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-brand-500/20"
        >
          {loading ? 'Processing…' : `Pay ₦${total.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
