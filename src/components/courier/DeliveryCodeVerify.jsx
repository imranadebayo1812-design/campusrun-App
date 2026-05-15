import { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/api/supabaseClient';
import { X, Lock } from 'lucide-react';

export default function DeliveryCodeVerify({ delivery, onSuccess, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (code.length !== 4) { setError('Enter the 4-digit code'); return; }
    if (code !== delivery.delivery_code) {
      setError('Incorrect code. Ask the buyer for the correct 4-digit code.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ status: 'delivered', delivered_at: new Date().toISOString() })
      .eq('id', delivery.id);

    if (updateError) {
      setError('Failed to mark as delivered. Try again.');
      setLoading(false);
      return;
    }

    try {
      await fetch('/api/complete-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryId: delivery.id }),
      });
    } catch {}

    onSuccess();
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-white/[0.08] rounded-2xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-400" />
            <p className="font-semibold text-white">Enter Delivery Code</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <p className="text-sm text-gray-400">Ask the buyer for their 4-digit code to confirm delivery.</p>

        <input
          type="number"
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={e => { setCode(e.target.value.slice(0, 4)); setError(''); }}
          placeholder="0000"
          className="w-full text-center text-4xl font-bold tracking-[0.5em] bg-surface-800 border-2 border-white/[0.08] text-white rounded-xl py-4 focus:outline-none focus:border-brand-500"
        />

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={verify}
          disabled={code.length !== 4 || loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
        >
          {loading ? 'Verifying…' : 'Confirm Delivery'}
        </button>
      </div>
    </div>,
    document.body
  );
}
