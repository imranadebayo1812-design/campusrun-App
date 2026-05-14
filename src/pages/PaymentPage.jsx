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
    } catch (e) {
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
    } catch {
      // Dispatch will be retried by backend polling
    }
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
    <div className="p-4 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Payment</h1>
      </div>

      {/* Order summary */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        <p className="text-sm font-semibold text-gray-700 mb-1">Order Summary</p>
        <div className="flex justify-between text-sm text-gray-600">
          <span>From</span><span className="font-medium text-gray-900">{delivery.pickup_location}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>To</span><span className="font-medium text-gray-900">{delivery.dropoff_location}</span>
        </div>
        {delivery.food_cost > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Food cost</span><span>₦{delivery.food_cost.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery fee</span><span>₦{delivery.delivery_fee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Service fee</span><span>₦{delivery.service_fee.toLocaleString()}</span>
        </div>
        <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900">
          <span>Total</span>
          <span className="text-brand-600 text-lg">₦{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Payment Method</p>
        <div className="space-y-2">
          <button
            onClick={() => setMethod('paystack')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              method === 'paystack' ? 'border-brand-500 bg-brand-50' : 'border-gray-200'
            }`}
          >
            <CreditCard className="w-5 h-5 text-brand-600" />
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Card / Bank Transfer</p>
              <p className="text-xs text-gray-500">Powered by Paystack</p>
            </div>
            {method === 'paystack' && <CheckCircle className="w-5 h-5 text-brand-500 ml-auto" />}
          </button>

          <button
            onClick={() => canUseWallet && setMethod('wallet')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              !canUseWallet ? 'opacity-50 cursor-not-allowed border-gray-200' :
              method === 'wallet' ? 'border-brand-500 bg-brand-50' : 'border-gray-200'
            }`}
          >
            <Wallet className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Wallet</p>
              <p className="text-xs text-gray-500">
                Balance: ₦{walletBalance.toLocaleString()}
                {!canUseWallet && ' — insufficient funds'}
              </p>
            </div>
            {method === 'wallet' && <CheckCircle className="w-5 h-5 text-brand-500 ml-auto" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-base shadow-lg"
      >
        {loading ? 'Processing…' : `Pay ₦${total.toLocaleString()}`}
      </button>
    </div>
  );
}
