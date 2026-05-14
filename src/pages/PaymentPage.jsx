import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { ensurePaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { CreditCard, Wallet, ChevronLeft, CheckCircle } from 'lucide-react';

export default function PaymentPage() {
  const { deliveryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useAuth();

  const delivery = location.state?.delivery;
  const [method, setMethod] = useState('paystack');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = delivery?.total_amount || 0;
  const walletBalance = profile?.wallet_balance || 0;
  const canUseWallet = walletBalance >= total;

  async function payWithWallet() {
    setLoading(true);
    setError('');

    const { error: rpcError } = await supabase.rpc('pay_delivery_with_wallet', {
      p_delivery_id: deliveryId,
      p_user_id: session.user.id,
      p_amount: total,
    });

    if (rpcError) {
      setError(rpcError.message || 'Wallet payment failed.');
      setLoading(false);
      return;
    }

    await refreshProfile();
    await dispatchOrder();
    navigate(`/track/${deliveryId}`);
    setLoading(false);
  }

  async function payWithPaystack() {
    setLoading(true);
    setError('');

    try {
      const PaystackPop = await ensurePaystack();
      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: session.user.email,
        amount: Math.round(total * 100),
        currency: 'NGN',
        ref: `CRUN-${deliveryId.slice(0, 8)}-${Date.now()}`,
        onSuccess: async (response) => {
          await supabase
            .from('deliveries')
            .update({
              payment_method: 'paystack',
              payment_reference: response.reference,
              payment_verified: true,
            })
            .eq('id', deliveryId);

          await dispatchOrder();
          navigate(`/track/${deliveryId}`);
          setLoading(false);
        },
        onCancel: () => {
          setError('Payment was cancelled.');
          setLoading(false);
        },
      });
      handler.openIframe();
    } catch {
      setError('Could not load payment. Please try again.');
      setLoading(false);
    }
  }

  async function dispatchOrder() {
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId }),
      });
    } catch {}
  }

  async function handlePay() {
    if (method === 'wallet') {
      await payWithWallet();
    } else {
      await payWithPaystack();
    }
  }

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
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base shadow-lg shadow-brand-500/20"
        >
          {loading ? 'Processing…' : `Pay ₦${total.toLocaleString()}`}
        </button>
      </div>
    </div>
  );
}
