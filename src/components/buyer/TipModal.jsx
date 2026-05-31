import { useState } from 'react';
import { X } from 'lucide-react';
import { ensurePaystack, PAYSTACK_PUBLIC_KEY } from '@/lib/paystack';
import { useAuth } from '@/context/AuthContext';

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
          await fetch('/api/tip', {
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
    <div className="fixed inset-x-0 top-0 z-[200] flex items-end" style={{ height: '100dvh', backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md mx-auto rounded-t-2xl p-5 space-y-4 border border-white/10" style={{ backgroundColor: '#111827', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div className="flex items-center justify-between">
          <p className="font-semibold text-white">Add a Tip</p>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-semibold text-white">Tip sent!</p>
            <p className="text-sm text-gray-400 mt-1">Your courier will appreciate it.</p>
            <button onClick={onClose} className="mt-4 bg-brand-500 hover:bg-brand-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors">Done</button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-400">Show your courier some appreciation</p>
            <div className="flex gap-2">
              {[100, 200, 500].map(a => (
                <button key={a} onClick={() => setAmount(String(a))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${amount == a ? 'bg-brand-500 text-white border-brand-500' : 'border-white/[0.08] text-gray-400 bg-surface-800'}`}>
                  ₦{a}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Custom amount (min ₦50)"
              className="w-full bg-surface-800 border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            <button
              onClick={sendTip}
              disabled={!amount || loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing…' : `Send ₦${amount || 0} Tip`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
