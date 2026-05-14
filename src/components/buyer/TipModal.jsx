import { useState } from 'react';
import { X } from 'lucide-react';
import { ensurePaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/api/supabaseClient';

export default function TipModal({ delivery, onClose }) {
  const { session } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function sendTip() {
    const tip = parseFloat(amount);
    if (!tip || tip < 50) return;
    setLoading(true);

    try {
      const PaystackPop = await ensurePaystack();
      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: session.user.email,
        amount: Math.round(tip * 100),
        currency: 'NGN',
        ref: `TIP-${delivery.id.slice(0, 8)}-${Date.now()}`,
        onSuccess: async (response) => {
          await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/tip`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deliveryId: delivery.id,
              courierId: delivery.courier_id,
              amount: tip,
              reference: response.reference,
            }),
          });
          setDone(true);
          setLoading(false);
        },
        onCancel: () => setLoading(false),
      });
      handler.openIframe();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-2xl w-full max-w-md mx-auto p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900">Add a Tip</p>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-gray-900">Tip sent!</p>
            <p className="text-sm text-gray-500 mt-1">Your courier will appreciate it.</p>
            <button onClick={onClose} className="mt-4 bg-brand-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">Show your courier some appreciation</p>
            <div className="flex gap-2">
              {[100, 200, 500].map(a => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${amount == a ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-700'}`}>
                  ₦{a}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Custom amount (min ₦50)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            <button
              onClick={sendTip}
              disabled={!amount || loading}
              className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {loading ? 'Processing…' : `Send ₦${amount || 0} Tip`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
